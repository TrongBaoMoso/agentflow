'use client'

import { useTranslations } from 'next-intl'

import type { useComposerAttachments } from './useComposerAttachments'
import type { useEmailRecipients } from './useEmailRecipients'
import type { ComposerSegment } from '../../_config/composerConfig'
import type { ChannelProfile } from '../../_config/conversationSectionConfig'
import type { CommChannel, CommChannelSide, CommComposePayload } from '@loanfactory-inc/omni-core'

import { useOmniHost, useSendCommMessage } from '@loanfactory-inc/omni-core'

import { useComposerSendGuard } from './useComposerSendGuard'
import { useOutsideConfirm } from './useOutsideConfirm'
import { segmentCarriesAttachments } from '../../_config/attachmentSegments'
import {
  buildOptimisticMessage,
  composeSendStatus,
  isFailedSendEnvelope,
  SEND_FAILURE_TOAST,
  sendFailureMessage,
  SMS_MAX_LENGTH,
  segmentsForSide,
  unfilledSlots
} from '../../_config/composerConfig'
import { outsideActionOf } from '../../_config/outsideConfirm'
import { useSendStatus } from '../SendStatusAnnouncer'

/**
 * The profile member that has to be on for a wire channel to be used. `CALL` never rides this
 * path (a call is dialled, not sent), and it maps to its member anyway so the table is total.
 */
const PROFILE_MEMBER: Record<CommChannel, keyof ChannelProfile> = { EMAIL: 'email', SMS: 'sms', CALL: 'call' }

/** What the active segment puts on the wire. */
type ComposeFields = {
  channels: CommChannel[]
  toPartyIds: string[]
  /** Ad-hoc typed recipient addresses (email only); split from matched party ids (§D2). */
  toEmails: string[]
  /**
   * The Cc row, same two shapes (omni-service#403). They travel as SEPARATE request fields and
   * are then CONCATENATED with the To lists by the server before the first guard runs, so they
   * are not a softer class of recipient at any point - they are the same recipients, carrying a
   * header annotation. Empty on every segment but email, and the Cc row only renders there.
   */
  ccPartyIds: string[]
  ccEmails: string[]
  subject: string | null
}

type UseComposerSendArgs = {
  transactionId: string
  side: CommChannelSide
  segment: ComposerSegment
  /**
   * The host's send-side channel profile - the SAME one the tab strip was filtered by. The send
   * path checks against it a second time rather than trusting that `segment` was filtered.
   */
  channels: ChannelProfile
  body: string
  /** The subject exactly as typed — what a failed send has to put back. */
  subject: string
  /** The subject as it will actually be SENT: typed, or the auto-subject line. */
  effectiveSubject: string
  /** The signed-in user's `comm_party` id — author of optimistic bubbles. */
  currentUserPartyId: string | null
  email: ReturnType<typeof useEmailRecipients>
  smsTo: string | null
  /** The sender's own Zoom connection makes SMS impossible (`useComposerZoomGates`). */
  smsBlocked: boolean
  /** No principal party at all is on this loan, so an external chat post would reach no one (#659/#721). */
  chatNoPortal: boolean
  attachments: ReturnType<typeof useComposerAttachments>
  /** A Team email carrying an ad-hoc OUTSIDE address — needs the same confirm as a Borrower send. */
  teamReachesOutside: boolean
  partyName: (id: string) => string
  /** Empty the box (body, subject, subject-edit, mention) the instant a send is dispatched. */
  clearDraft: () => void
  /** Put a rejected send's text back exactly as it was typed. */
  restoreDraft: (draft: { body: string; subject: string }) => void
  /** Fired after a send is dispatched so the stream can pin to the newest message (U1). */
  onAfterSend?: () => void
}

/**
 * The composer's send pipeline: what may be sent, what goes on the wire, the optimistic
 * row, the failure rollback, and the "Send outside the company?" confirm that gates it.
 *
 * Extracted from `Composer.tsx` (tera-fe#237) — that file sat at exactly 500 of the enforced
 * 500-line `max-lines` cap, so the next line added to it would have failed lint and blocked
 * every staging deploy. This is the seam the ticket named first, and it is a real one: what
 * stays behind is a form (fields, segments, pickers, keyboard handling) and what moves is one
 * transaction against the server. Behaviour is unchanged; only the boundary is new.
 */
export const useComposerSend = ({
  transactionId,
  side,
  segment,
  channels: profile,
  body,
  subject,
  effectiveSubject,
  currentUserPartyId,
  email,
  smsTo,
  smsBlocked,
  chatNoPortal,
  attachments,
  teamReachesOutside,
  partyName,
  clearDraft,
  restoreDraft,
  onAfterSend
}: UseComposerSendArgs) => {
  const t = useTranslations('Conversation')
  // Failures only, and bottom-center keeps them clear of the header controls (U12).
  const host = useOmniHost()
  const { notifyError } = host.useToast('bottom-center')
  const [sendStatus, announceSent] = useSendStatus()
  const { mutate: sendMessage } = useSendCommMessage(transactionId)
  // Empties and locks the composer for the round trip; restores the draft if it fails (U4).
  const send = useComposerSendGuard()

  const isExternal = side === 'EXTERNAL'

  /**
   * "Send outside the company?" guards content leaving the org: the whole Borrower side, OR a
   * Team email that carries an ad-hoc outside address (teammate-only Team email needs no confirm).
   *
   * TWO SEPARATE QUESTIONS, and conflating them is what the review caught (#659, MAJOR 1).
   *
   * WHETHER to confirm is a deny-list by side - "not a call" rather than a list of media. It was
   * `email || sms`, and chat arrived on this side as a THIRD way to reach the borrower, which a
   * list would have compiled straight past. `call` is the one exclusion and it never reaches this
   * path anyway (`canSend` is false for it, and dialling has its own flow), so anything added
   * later is confirmed until someone decides otherwise here, in writing. That is the fail-closed
   * direction.
   *
   * WHAT an answer BUYS is the lattice, and it lives in `useOutsideConfirm` with the reply box's
   * half of the same gate. `teamReachesOutside` asks for `dispatch` on its own account rather than
   * by the segment map: it is a Team EMAIL carrying an ad-hoc outside address, so the map already
   * answers `dispatch` for it, and the explicit branch is here so the two can never drift if a
   * second way for a Team row to reach outside is ever added.
   */
  const outside = useOutsideConfirm({
    side,
    reachesOutside: (isExternal && segment !== 'call') || teamReachesOutside,
    action: teamReachesOutside ? 'dispatch' : outsideActionOf(segment)
  })

  // DEFENCE IN DEPTH, not the fix. `useComposerDraft` already never answers a segment the profile
  // has closed; this is the line that still holds if some later path seats one anyway, because a
  // text to a candidate who opted out of SMS is a compliance incident, not a UI glitch.
  const segmentAllowed = segmentsForSide(side, profile).some((seg) => seg.id === segment)

  const canSend = (() => {
    if (segment === 'call' || send.sending || !segmentAllowed) return false
    if (!body.trim()) return false
    // A TEMPLATE'S `[slots]` MUST BE REPLACED BEFORE THE MESSAGE LEAVES (#914). Since #753 the
    // Status update body carries `[what has been completed]` and `[next step]` as literal slots,
    // and nothing checked they had been filled - so the brackets could reach the borrower.
    //
    // SCOPED BY SIDE, NOT BY SEGMENT, and that is the whole correction the review forced. The gate
    // shipped as `segment === 'email'` on the reasoning that the Templates menu renders nowhere
    // else. It does not - but the BODY does: `draftKey` is `user|loan|side` and `setSegment` writes
    // only the segment, so a template body survives a flip to SMS or to chat and left both
    // ungated. `tpl_status_body` is 169 characters in en and 178 in vi, comfortably under
    // `SMS_MAX_LENGTH`, and chat has no cap at all - so the brackets reached the borrower through a
    // WORSE pipe than the one being blocked: an unsubjected personal-looking text, sent by the
    // plain Enter that every non-email segment takes.
    //
    // The draft key is the right shape for the rule: a template body can reach any segment on the
    // EXTERNAL side and no segment on the Team side. This also keeps the part of the narrower
    // argument that had force - Team-side prose containing `[sic]` stays ungated, because no
    // template can put brackets there.
    //
    // ONE GATE covers every route out: `canSend` is read by the Send button AND by `attemptSend`,
    // so Ctrl+Enter and plain Enter are refused by this same line, where a dialog would have had to
    // be sequenced behind the `SendOutsideDialog` that opens on this very send.
    // `UnfilledSlotsNotice` prints WHICH slots beside the disabled button, exactly as the
    // Cc-without-To rule below prints its reason.
    if (isExternal && unfilledSlots(body).length) return false
    // Email also waits for in-flight uploads — sending mid-upload would silently drop the file.
    // THE TO ROW'S COUNT, NOT THE WHOLE AUDIENCE'S, and that is the point rather than an
    // oversight. omni refuses an email whose only recipients are Cc'd (`ErrCcWithoutRecipient`,
    // 400), and the contract asks this client to PREVENT that request rather than earn the
    // refusal - so a draft carrying a Cc and no To keeps Send disabled, with
    // `ComposerRecipientRows` printing the reason beside it.
    if (segment === 'email')
      return email.to.selectedIds.length + email.to.adHocEmails.length > 0 && !attachments.blockingUpload
    if (segment === 'sms') return !smsBlocked && !!smsTo && body.length <= SMS_MAX_LENGTH
    // Chat needs no recipient - the row carries none - but an EXTERNAL post still needs somebody
    // able to read it. `chatNoPortal` is false on the Team side, where the audience is the team.
    // It waits on an in-flight upload for the same reason email does: chat carries files now, and
    // a send mid-upload drops them silently.
    if (segment === 'chat') return !chatNoPortal && !attachments.blockingUpload
    return true
  })()

  const composeFields = (): ComposeFields => {
    switch (segment) {
      case 'email':
        return {
          channels: ['EMAIL'],
          toPartyIds: email.to.selectedIds,
          toEmails: email.to.adHocEmails,
          ccPartyIds: email.cc.selectedIds,
          ccEmails: email.cc.adHocEmails,
          subject: effectiveSubject
        }
      case 'sms':
        return {
          channels: ['SMS'],
          toPartyIds: smsTo ? [smsTo] : [],
          toEmails: [],
          ccPartyIds: [],
          ccEmails: [],
          subject: null
        }
      default:
        return { channels: [], toPartyIds: [], toEmails: [], ccPartyIds: [], ccEmails: [], subject: null }
    }
  }

  /** FALSE = declined. Both guards read live state that can flip while the confirm dialog is
   *  open, and declining silently there is how #66 lost a confirmed SMS (ComposerConfirmedSend). */
  const doSend = (): boolean => {
    if (!canSend) return false
    const { channels, toPartyIds, toEmails, ccPartyIds, ccEmails, subject: subj } = composeFields()
    // The last check before the wire, on what is ABOUT to be sent rather than on the segment that
    // produced it. Ahead of `send.begin`, so a refusal leaves the box and the lock untouched.
    if (channels.some((ch) => !profile[PROFILE_MEMBER[ch]])) return false
    if (!send.begin({ body, subject })) return false
    const payload: CommComposePayload = {
      side,
      body: body.trim(),
      ...(channels.length ? { channels } : {}),
      ...(toPartyIds.length ? { to_party_ids: toPartyIds } : {}),
      ...(toEmails.length ? { to_emails: toEmails } : {}),
      // Optional-first, exactly as `to_emails` is: a draft with no Cc puts no key on the wire and
      // posts the byte-identical body it posted before this change, which is what lets omni (whose
      // decoder is strict) deploy ahead of this client without a flag.
      ...(ccPartyIds.length ? { cc_party_ids: ccPartyIds } : {}),
      ...(ccEmails.length ? { cc_emails: ccEmails } : {}),
      ...(segment === 'email' && subj ? { subject: subj } : {}),
      // Uploaded FileStorage ids — the server links them to the message at compose time, on a
      // channel-less (chat) row exactly as on an emailed one. `segmentCarriesAttachments` is the
      // gate rather than `segment === 'email'`: a chat attachment is a STORE, not a dispatch.
      ...(segmentCarriesAttachments(segment) && attachments.readyIds.length
        ? { attachment_file_ids: attachments.readyIds }
        : {})
    }
    const optimistic = buildOptimisticMessage({
      transactionId,
      side,
      authorPartyId: currentUserPartyId,
      channels,
      // Ad-hoc addresses aren't parties yet — the server view reconciles them in.
      toPartyIds,
      ccPartyIds,
      subject: subj,
      body: body.trim()
    })
    // EVERY RECIPIENT, To then Cc. The spoken confirmation of a send is one of the three places
    // this surface states its audience, and a Cc left out of it would be a message that reached
    // somebody the announcement never named.
    const names = [...toPartyIds.map(partyName), ...ccPartyIds.map(partyName), ...toEmails, ...ccEmails]
      .filter(Boolean)
      .join(', ')
    const sentStatus = composeSendStatus(segment, t, names)
    // Empty the box NOW — the optimistic row carries the text, and leaving it typed under a live
    // button only invites sending it twice. Recipients and staged files stay until confirmed.
    clearDraft()
    // A rejected send (a 4xx/5xx makes the mutation throw → onError; a dead network RESOLVES with
    // http_code 0 → onSuccess + isFailedSendEnvelope) must put the draft BACK and say why it failed
    // — otherwise the optimistic row rolls back and the message silently vanishes (the "email
    // disappears after Send" bug).
    const onSendFailed = (src?: unknown) => {
      send.recover(restoreDraft)
      notifyError(sendFailureMessage(src, t), SEND_FAILURE_TOAST)
    }
    sendMessage(
      { payload, optimistic },
      {
        onSuccess: (res) => {
          if (isFailedSendEnvelope(res)) {
            onSendFailed(res)
            return
          }
          // Success is quiet: the bubble is already on screen. Announced, not shown.
          send.settle()
          announceSent(sentStatus)
          if (segment === 'email') email.resetAdHoc()
          attachments.reset()
          onAfterSend?.()
        },
        onError: (err) => onSendFailed(err)
      }
    )
    return true
  }

  const attemptSend = () => {
    if (!canSend) return
    outside.guard(doSend)
  }

  /** The confirm dialog's Send. Silence here reads as success: the dialog closes either way (#66). */
  const confirmSend = () => {
    if (!outside.confirm(doSend)) notifyError(t('toast_send_failed'), SEND_FAILURE_TOAST)
  }

  return {
    /** The screen-reader live region — render it inside the composer card. */
    sendStatus,
    sending: send.sending,
    canSend,
    attemptSend,
    pendingConfirm: outside.pending,
    cancelConfirm: outside.cancel,
    confirmSend
  }
}
