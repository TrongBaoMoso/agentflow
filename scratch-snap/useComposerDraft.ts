'use client'

import { useEffect, useRef, useState } from 'react'

import type { ComposerDraft } from '../../../../util/omniDraftStore'
import type { ChannelProfile } from '../../_config/conversationSectionConfig'
import type { CommChannelSide } from '@loanfactory-inc/omni-core'

import { useOmniHost } from '@loanfactory-inc/omni-core'

import { clearDraft, clearDraftsForUser, draftKey, readDraft, writeDraft } from '../../../../util/omniDraftStore'
import { defaultSegmentForSide, segmentsForSide, type ComposerSegment } from '../../_config/composerConfig'

type UseComposerDraftArgs = {
  /** The loan this composer writes about - one third of the draft key. */
  subjectId: string
  /** The audience tab the reader is on - the P5 third of the key (see `draftKey`). */
  side: CommChannelSide
  /** The adopter's send-side channel profile, which decides the side's default segment. */
  channels: ChannelProfile
}

export type ComposerDraftState = ComposerDraft & {
  setSegment: (next: ComposerSegment) => void
  setBody: (next: string) => void
  setSubject: (next: string) => void
  /** A held draft was just seated, and the reader has not typed since. Drives the hint (#674). */
  restored: boolean
  /** Empty the box and forget the held draft - what a dispatched send does. */
  clear: () => void
}

/**
 * The three fields a draft is made of - body, email subject, segment - and their survival
 * across a remount of the composer (#674).
 *
 * The state itself used to be three `useState`s in `Composer`, which is why closing the record
 * drawer discarded a half-written message. It is still three `useState`s; what is new is that
 * each one is SEATED from `omniDraftStore` on mount and written back on every edit, so the
 * composer that comes back up under the same user, the same loan and the same audience comes
 * back up holding what was typed.
 *
 * The key changes with the side, so a side switch no longer CLEARS the draft, it SEATS a
 * different one: the Team text is put away and the borrower-side text (usually nothing) is
 * brought out. The P5 rule the old reset enforced by emptying the box is now enforced by the
 * key itself, which is stronger - there is no code path from the outside side that can address
 * the Team entry. See `draftKey`.
 *
 * NOT restored, deliberately: the recipient selections and the staged attachments. Recipients
 * are re-derived from the cast on mount, and a stale ad-hoc outside address riding a restored
 * Team email is precisely the state the send guard exists to catch - re-deriving keeps that
 * guard authoritative. Staged files are server objects the composer would have to re-verify.
 * `editSubject`, the mention menu and the staged files stay in `Composer`'s own side reset.
 */
export const useComposerDraft = ({ subjectId, side, channels }: UseComposerDraftArgs): ComposerDraftState => {
  const host = useOmniHost()
  // The HOST's user id, not `currentUserPartyId`: the party id is null whenever the cast has no
  // self row, and a key that can go null on a legitimate loan is not a key.
  const userId = host.useCurrentUserId()
  const key = draftKey(userId, subjectId, side)
  const held = readDraft(key)

  /**
   * THE SEGMENTS THIS HOST ALLOWS RIGHT NOW, and the segment this hook answers is always one of
   * them. A held draft remembers the medium it was written on, and the profile can have closed
   * that medium since: recruit-fe drops SMS for a candidate who opted out (its TCPA pre-check), and
   * a refetch can do the same mid-session. The tab strip already hides the closed tab, but the
   * send path reads THIS value - so a restored `'sms'` draft used to go out as an SMS through a
   * tab nobody could see. `snap` answers the side's default in its place.
   *
   * `allowedKey` is the list as a string so the snap effect below re-runs when the MEMBERSHIP
   * changes, not every time a host hands over a fresh profile object with the same three flags.
   */
  const allowed = segmentsForSide(side, channels).map((seg) => seg.id)
  const allowedKey = allowed.join('|')
  const snap = (seg: ComposerSegment): ComposerSegment =>
    allowed.includes(seg) ? seg : defaultSegmentForSide(side, channels)

  const [segment, setSegmentState] = useState<ComposerSegment>(held?.segment ?? defaultSegmentForSide(side, channels))
  const [body, setBodyState] = useState(held?.body ?? '')
  const [subject, setSubjectState] = useState(held?.subject ?? '')
  const [restored, setRestored] = useState(Boolean(held))

  /**
   * What is currently in the box, readable synchronously. The setters write the WHOLE draft
   * back, and two of them can fire in one handler (a template sets a subject and a body), so
   * reading the other two fields off state would write the first edit's value twice.
   */
  const current = useRef<ComposerDraft>({ body, subject, segment })
  current.current = { body, subject, segment }

  const write = (patch: Partial<ComposerDraft>) => {
    current.current = { ...current.current, ...patch }
    writeDraft(key, current.current)
  }

  /**
   * Re-seat on a key change: another loan, the other audience, or a different signed-in user.
   * Keyed on the key rather than on `side` so all three routes into a different draft go
   * through one place.
   */
  const seated = useRef(key)
  useEffect(() => {
    if (seated.current === key) return
    seated.current = key
    const next = readDraft(key)
    current.current = {
      body: next?.body ?? '',
      subject: next?.subject ?? '',
      segment: next?.segment ?? defaultSegmentForSide(side, channels)
    }
    setSegmentState(current.current.segment)
    setBodyState(current.current.body)
    setSubjectState(current.current.subject)
    setRestored(Boolean(next))
  }, [key])

  /**
   * Snap a segment the profile no longer allows - a restored draft's, or the one on screen when a
   * channel closes mid-session - onto the default, in state AND in the store, so the reader stays
   * on the tab they can see even if the channel later re-opens, and a remount agrees with it.
   * Declared after the re-seat so a key change and a profile change in one commit both land here
   * reading the re-seated segment. The render before this runs is already safe: the return value
   * below snaps too.
   */
  useEffect(() => {
    const snapped = snap(current.current.segment)
    if (snapped === current.current.segment) return
    setSegmentState(snapped)
    write({ segment: snapped })
  }, [key, allowedKey])

  /**
   * A different signed-in user means the last one has gone, and a sign-out that does not
   * reload the page leaves this module standing with their unsent messages in it.
   */
  const lastUser = useRef(userId)
  useEffect(() => {
    if (lastUser.current === userId) return
    if (lastUser.current) clearDraftsForUser(lastUser.current)
    lastUser.current = userId
  }, [userId])

  return {
    segment: snap(segment),
    body,
    subject,
    restored,
    setSegment: (next) => {
      // A segment the profile does not offer is not a choice the reader can make; keep the one on screen.
      if (!allowed.includes(next)) return
      setSegmentState(next)
      setRestored(false)
      write({ segment: next })
    },
    setBody: (next) => {
      setBodyState(next)
      setRestored(false)
      write({ body: next })
    },
    setSubject: (next) => {
      setSubjectState(next)
      setRestored(false)
      write({ subject: next })
    },
    clear: () => {
      setBodyState('')
      setSubjectState('')
      setRestored(false)
      current.current = { ...current.current, body: '', subject: '' }
      clearDraft(key)
    }
  }
}
