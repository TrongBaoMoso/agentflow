package com.mvu.loan.server.op.loan;

import java.io.IOException;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.Set;
import java.util.TimeZone;
import java.util.function.BiFunction;
import java.util.function.Consumer;
import java.util.function.Predicate;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventAttendee;
import com.google.api.services.drive.model.File;
import com.google.appengine.api.NS;
import com.google.appengine.api.memcache.Expiration;
import com.google.appengine.api.memcache.MemcacheService;
import com.google.appengine.api.memcache.MemcacheServiceFactory;
import com.moso.core.Logger;
import com.moso.ringcentral.shared.entity.HasParticipants;
import com.mvu.appengine.GoogleAnalyticsMeasurementUtil;
import com.mvu.appengine.db.Bean;
import com.mvu.appengine.db.Bundle;
import com.mvu.appengine.db.DSQueryBuilder;
import com.mvu.appengine.server.NotificationFactory;
import com.mvu.appengine.server.op.EmailAllOp;
import com.mvu.appengine.server.op.EmailTemplateOp;
import com.mvu.appengine.server.op.SaveGenericNoteOp;
import com.mvu.appengine.server.op.ShortenUrlWithFirebaseOp;
import com.mvu.appengine.server.template.Engine;
import com.mvu.core.client.resource.CoreMessages;
import com.mvu.core.client.resource.States;
import com.mvu.core.db.IKey;
import com.mvu.core.server.Bucket;
import com.mvu.core.server.CanBeStored;
import com.mvu.core.server.CellData;
import com.mvu.core.server.EmailOptions;
import com.mvu.core.server.JSON;
import com.mvu.core.server.QueryBuilder;
import com.mvu.core.server.Server;
import com.mvu.core.server.SessionUser;
import com.mvu.core.server.ThreadContext;
import com.mvu.core.server.op.OpRegistry;
import com.mvu.core.server.util.JSONUtil;
import com.mvu.core.server.util.ServerDateUtils;
import com.mvu.core.shared.Action;
import com.mvu.core.shared.App;
import com.mvu.core.shared.ErrorMessage;
import com.mvu.core.shared.FieldsBase;
import com.mvu.core.shared.Format;
import com.mvu.core.shared.HasValues;
import com.mvu.core.shared.HttpParams;
import com.mvu.core.shared.QueryResult;
import com.mvu.core.shared.SharedConstants;
import com.mvu.core.shared.Type;
import com.mvu.core.shared.datatype.BooleanType;
import com.mvu.core.shared.datatype.DecimalType;
import com.mvu.core.shared.datatype.JsonObjectType;
import com.mvu.core.shared.datatype.LanguageLibrary;
import com.mvu.core.shared.datatype.StringType;
import com.mvu.core.shared.entity.Configuration;
import com.mvu.core.shared.entity.Contact;
import com.mvu.core.shared.entity.HasBranch;
import com.mvu.core.shared.entity.HasKey;
import com.mvu.core.shared.entity.HasLastNote;
import com.mvu.core.shared.entity.HasNames;
import com.mvu.core.shared.entity.HasTeam;
import com.mvu.core.shared.entity.History;
import com.mvu.core.shared.entity.Note;
import com.mvu.core.shared.entity.OptOutRequest;
import com.mvu.core.shared.entity.SystemStatus;
import com.mvu.core.shared.entity.Template;
import com.mvu.core.shared.entity.ZipCode;
import com.mvu.core.shared.field.FK;
import com.mvu.core.shared.field.Field;
import com.mvu.core.shared.params.EmailParams;
import com.mvu.core.shared.params.TableParams;
import com.mvu.core.shared.typekey.AssignableStatus;
import com.mvu.core.shared.typekey.CompareType;
import com.mvu.core.shared.typekey.QueueType;
import com.mvu.core.shared.util.Colls;
import com.mvu.core.shared.util.Dates;
import com.mvu.core.shared.util.MapCounter;
import com.mvu.core.shared.util.Modules;
import com.mvu.core.shared.util.Strings;
import com.mvu.core.shared.util.Tuple2;
import com.mvu.gapi.server.GoogleMap;
import com.mvu.gapi.server.calendar.GoogleCalendar;
import com.mvu.gapi.server.drive.GoogleDrive;
import com.mvu.gapi.server.drive.GoogleDrive.GoogleDriveRole;
import com.mvu.gapi.server.drive.PermissionService;
import com.mvu.loan.client.bundle.LoanMessages;
import com.mvu.loan.client.message.AdminPageMessages;
import com.mvu.loan.client.view.LoansView;
import com.mvu.loan.client.view.mod.AssemblyLineMod;
import com.mvu.loan.client.view.mod.DisclosureMod;
import com.mvu.loan.client.view.partner.ReferralAgentMod;
import com.mvu.loan.server.NotifyWhenMarketplaceEventUpcoming;
import com.mvu.loan.server.op.CloseStandAloneWatLeadWithTheSameEmailOp;
import com.mvu.loan.server.op.CreatePendingAlertForFundedLoan;
import com.mvu.loan.server.op.FindLoanOfficerOp;
import com.mvu.loan.server.op.FindRecruiterLiveOp;
import com.mvu.loan.server.op.GetLoanPrograms;
import com.mvu.loan.server.op.MosoPricingAPI;
import com.mvu.loan.server.op.agent.RecordReferralOp;
import com.mvu.loan.server.op.annotation.UsedBy;
import com.mvu.loan.server.op.api.WebPlusAPI;
import com.mvu.loan.server.op.closing_cost.FindLoanFeesOp;
import com.mvu.loan.server.op.condition.ClearTodoOp;
import com.mvu.loan.server.op.condition.DeleteTodoOp;
import com.mvu.loan.server.op.condition.SaveTodoOp;
import com.mvu.loan.server.op.condition.TodoHandler;
import com.mvu.loan.server.op.lender.SaveMarketPlaceEventOp;
import com.mvu.loan.server.op.pdf_form.DocumentUtils;
import com.mvu.loan.server.op.pdf_form.NotifySigningDocumentOp;
import com.mvu.loan.server.op.pdf_form.RequestBorrowerCompleteEsignOp;
import com.mvu.loan.server.op.task.WorkflowTaskOp;
import com.mvu.loan.server.op.zoom.SendZoomSMSOp;
import com.mvu.loan.shared.AlertUtils;
import com.mvu.loan.shared.ChannelsFilter;
import com.mvu.loan.shared.LoanUtils;
import com.mvu.loan.shared.PerformanceReportUtils;
import com.mvu.loan.shared.ToDosFilter;
import com.mvu.loan.shared.borrower.BorrowersRelationship;
import com.mvu.loan.shared.entity.Admin;
import com.mvu.loan.shared.entity.Alert;
import com.mvu.loan.shared.entity.AuditItems;
import com.mvu.loan.shared.entity.AutoToDoConfig;
import com.mvu.loan.shared.entity.BankNameDictionary;
import com.mvu.loan.shared.entity.BankStatementDoc;
import com.mvu.loan.shared.entity.Borrower;
import com.mvu.loan.shared.entity.Branch;
import com.mvu.loan.shared.entity.Campaign;
import com.mvu.loan.shared.entity.Client;
import com.mvu.loan.shared.entity.CommissionConfiguration;
import com.mvu.loan.shared.entity.Company;
import com.mvu.loan.shared.entity.Condition;
import com.mvu.loan.shared.entity.CountingType;
import com.mvu.loan.shared.entity.DisclosureDocumentConfig;
import com.mvu.loan.shared.entity.DisclosureSetting;
import com.mvu.loan.shared.entity.DocumentAIConfiguration;
import com.mvu.loan.shared.entity.EscalationTicket;
import com.mvu.loan.shared.entity.EscalationTicketStatus;
import com.mvu.loan.shared.entity.Escrow;
import com.mvu.loan.shared.entity.EscrowCompany;
import com.mvu.loan.shared.entity.EscrowWorkflow;
import com.mvu.loan.shared.entity.FacebookAdStatistic;
import com.mvu.loan.shared.entity.FacebookLead;
import com.mvu.loan.shared.entity.FederalHolidaysConfig;
import com.mvu.loan.shared.entity.FnmImport;
import com.mvu.loan.shared.entity.HasFollowUp;
import com.mvu.loan.shared.entity.HasSsns;
import com.mvu.loan.shared.entity.HousingExpense;
import com.mvu.loan.shared.entity.InHouseClosingCompany;
import com.mvu.loan.server.op.recruiting.LoRecruiterProgramStanding;
import com.mvu.loan.shared.entity.LORecruiting;
import com.mvu.loan.shared.entity.Leave;
import com.mvu.loan.shared.entity.Lender;
import com.mvu.loan.shared.entity.LenderAgreement;
import com.mvu.loan.shared.entity.LenderAgreement.RebatesRow;
import com.mvu.loan.shared.entity.License;
import com.mvu.loan.shared.entity.Loan;
import com.mvu.loan.shared.entity.LoanConfiguration;
import com.mvu.loan.shared.entity.LoanFee;
import com.mvu.loan.shared.entity.Lock;
import com.mvu.loan.shared.entity.Marketing;
import com.mvu.loan.shared.entity.MarketplaceEvent;
import com.mvu.loan.shared.entity.NonLicenseSetting;
import com.mvu.loan.shared.entity.PartnerAgent;
import com.mvu.loan.shared.entity.PerformanceReport;
import com.mvu.loan.shared.entity.PreApprovalLetter;
import com.mvu.loan.shared.entity.PylonLoan;
import com.mvu.loan.shared.entity.Quote;
import com.mvu.loan.shared.entity.QuoteConfiguration;
import com.mvu.loan.shared.entity.Realtor;
import com.mvu.loan.shared.entity.RealtorReferralConfig;
import com.mvu.loan.shared.entity.ReferralTracking;
import com.mvu.loan.shared.entity.ReportRecord;
import com.mvu.loan.shared.entity.RequestQuoteStatus;
import com.mvu.loan.shared.entity.RequestQuoteTicket;
import com.mvu.loan.shared.entity.ReviewColleagues;
import com.mvu.loan.shared.entity.SigningSession;
import com.mvu.loan.shared.entity.SigningSessionConfig;
import com.mvu.loan.shared.entity.TaskPattern;
import com.mvu.loan.shared.entity.Ticket;
import com.mvu.loan.shared.entity.TicketStatus;
import com.mvu.loan.shared.entity.TicketType;
import com.mvu.loan.shared.entity.ToFollowUp;
import com.mvu.loan.shared.entity.Transaction;
import com.mvu.loan.shared.entity.User;
import com.mvu.loan.shared.entity.W2SEntity;
import com.mvu.loan.shared.entity.WorkflowTask;
import com.mvu.loan.shared.entity.ZoomSMSMessage;
import com.mvu.loan.shared.form.GenerateDocType;
import com.mvu.loan.shared.label.ReferralAgentMessages;
import com.mvu.loan.shared.referral_agent.RealtorType;
import com.mvu.loan.shared.referral_agent.ReferralAgentStatus;
import com.mvu.loan.shared.task.LoanWorkFlows;
import com.mvu.loan.shared.typekey.AlertStatus;
import com.mvu.loan.shared.typekey.AppraisalStatus;
import com.mvu.loan.shared.typekey.AuditStatus;
import com.mvu.loan.shared.typekey.ConditionOwnerType;
import com.mvu.loan.shared.typekey.DisableAlertReason;
import com.mvu.loan.shared.typekey.EscrowTask;
import com.mvu.loan.shared.typekey.FacebookAdStatus;
import com.mvu.loan.shared.typekey.LenderTierType;
import com.mvu.loan.shared.typekey.LoanMilestones;
import com.mvu.loan.shared.typekey.LoanPermissions;
import com.mvu.loan.shared.typekey.LoanPositionType;
import com.mvu.loan.shared.typekey.LoanSection;
import com.mvu.loan.shared.typekey.LoanSourceType;
import com.mvu.loan.shared.typekey.LoanStatus;
import com.mvu.loan.shared.typekey.MCRCode;
import com.mvu.loan.shared.typekey.MarketplaceEventStatus;
import com.mvu.loan.shared.typekey.OwnerType;
import com.mvu.loan.shared.typekey.RealtorSpecialtyType;
import com.mvu.loan.shared.typekey.ReferrerType;
import com.mvu.loan.shared.typekey.ReportType;
import com.mvu.loan.shared.typekey.SubscriptionType;
import com.mvu.quote.server.pylon.PylonMargin;
import com.mvu.quote.shared.QuoteUtils;
import com.mvu.quote.shared.entity.CustomClosingFee;
import com.mvu.quote.shared.entity.LEFormSection;
import com.mvu.quote.shared.entity.LoanProgram;
import com.mvu.quote.shared.entity.Rate;
import com.mvu.quote.shared.typekey.CreditEventStatus;
import com.mvu.quote.shared.typekey.LenderType;
import com.mvu.quote.shared.typekey.LoanCategory;
import com.mvu.quote.shared.typekey.LoanChannel;
import com.mvu.quote.shared.typekey.LoanProgramType;
import com.mvu.quote.shared.typekey.LoanType;
import com.mvu.quote.shared.typekey.MortgageLatesType;
import com.mvu.quote.shared.typekey.OccupancyType;
import com.mvu.quote.shared.typekey.PurposeType;
import com.mvu.quote.shared.typekey.TransactionType;
import org.jetbrains.annotations.NotNull;

import static com.mvu.core.server.Server.bucket;
import static com.mvu.core.shared.entity.HasEmail.email_name;
import static com.mvu.core.shared.entity.HasKey.created;
import static com.mvu.core.shared.entity.HasProgress.complete_percentage;
import static com.mvu.core.shared.typekey.AssignableStatus.Cleared;
import static com.mvu.gapi.server.drive.GoogleDrive.getInstance;
import static com.mvu.loan.client.bundle.LoanMessages.loanMessages;
import static com.mvu.loan.client.lender.LenderMessages.lenderMessages;
import static com.mvu.loan.shared.PerformanceReportUtils.internalReviewLoanCache;
import static com.mvu.loan.shared.entity.Application.total_loan_amount;
import static com.mvu.loan.shared.entity.Company.LOANTOWN;
import static com.mvu.loan.shared.entity.Company.LOAN_FACTORY;
import static com.mvu.loan.shared.entity.FacebookLead.FACEBOOK_GRAPH_URL;
import static com.mvu.loan.shared.entity.Loan.NON_QM_QUOTE_FIELDS;
import static com.mvu.loan.shared.entity.Loan.QUOTE_FIELDS;
import static com.mvu.loan.shared.entity.Loan.appraisal_entered;
import static com.mvu.loan.shared.entity.Loan.appraisal_ordered;
import static com.mvu.loan.shared.entity.Loan.appraisal_report_fee;
import static com.mvu.loan.shared.entity.Loan.appraised_value;
import static com.mvu.loan.shared.entity.Loan.archive_reason;
import static com.mvu.loan.shared.entity.Loan.current_task_pattern;
import static com.mvu.loan.shared.entity.Loan.dead;
import static com.mvu.loan.shared.entity.Loan.death;
import static com.mvu.loan.shared.entity.Loan.death_note;
import static com.mvu.loan.shared.entity.Loan.earliest_signing_date;
import static com.mvu.loan.shared.entity.Loan.earliest_signing_date_timestamp;
import static com.mvu.loan.shared.entity.Loan.earliest_signing_date_tz;
import static com.mvu.loan.shared.entity.Loan.email;
import static com.mvu.loan.shared.entity.Loan.escrow;
import static com.mvu.loan.shared.entity.Loan.funded;
import static com.mvu.loan.shared.entity.Loan.lock_key;
import static com.mvu.loan.shared.entity.Loan.locked_rate;
import static com.mvu.loan.shared.entity.Loan.next_tasks;
import static com.mvu.loan.shared.entity.Loan.number_active_liens_found;
import static com.mvu.loan.shared.entity.Loan.ordered_appraisal;
import static com.mvu.loan.shared.entity.Loan.paid_by_the_loan_officer;
import static com.mvu.loan.shared.entity.Loan.person_placed_the_judgement;
import static com.mvu.loan.shared.entity.Loan.property_value;
import static com.mvu.loan.shared.entity.Loan.workflow_tasks;
import static com.mvu.loan.shared.entity.Transaction.final_date_tz;
import static com.mvu.loan.shared.entity.Transaction.milestone_progress;
import static com.mvu.loan.shared.entity.Transaction.uploaded_rate_sheet_files;
import static com.mvu.loan.shared.entity.Transaction.wa_rate_lock_agreement_file;
import static com.mvu.loan.shared.label.ConditionCodes.conditionCodes;
import static com.mvu.loan.shared.label.ConditionLabels.conditionLabels;
import static com.mvu.loan.shared.typekey.AlertStatus.Active;
import static com.mvu.loan.shared.typekey.AlertStatus.Disabled;
import static com.mvu.loan.shared.typekey.AlertStatus.Pending;
import static com.mvu.loan.shared.typekey.LoanMilestones.pending_lender_s_approval;
import static com.mvu.loan.shared.typekey.LoanMilestones.prior_to_underwriting;
import static com.mvu.loan.shared.typekey.LoanMilestones.set_up;
import static com.mvu.loan.shared.typekey.LoanMilestones.submitting_to_lender;
import static com.mvu.quote.shared.QuoteUtils.findCompensation;
import static com.mvu.quote.shared.entity.CustomClosingFee.DEFAULT_CUSTOM_FEE_SECTIONS;

/**
 * Date: 12/10/13 12:04 PM
 */
@UsedBy(target = {WebPlusAPI.class})
public class LoanOps {

  private static Logger logger = Logger.getLogger(LoanOps.class.getClass().getName());
  private static boolean checkIfBorrowerHasSameLOSSN = false;

  /**
   * MOSO-16590: users may clear the lender-issued fields (loan_number, lender_url) at any time —
   * e.g. after moving the file to a different lender. Loan forms submit every input
   * (submitAllValue), so blanking one of these fields on the UI and submitting sends it back as a
   * present-but-blank key. Treat that as an intentional removal: clear the stored value and drop
   * the key from the incoming payload so copyFrom cannot write back a blank string. Every removal
   * is logged (loan id, previous value, user) so the change can be audited later.
   * <p>
   * We only act when the loan actually has a stored value to clear. An absent key (field not on
   * this form), or a blank key when nothing is stored, is left untouched — there is nothing to
   * remove. A non-blank incoming value falls through to the caller's normal copyFrom, which
   * overwrites the stored value as usual.
   */
  public static void applyLenderIssuedFieldRemoval(HasValues input, HasValues loan) {
    for (Field<String> field : Arrays.asList(Loan.loan_number, Loan.lender_url)) {
      // an explicit blank submission that would clear an existing value = an intentional removal
      if (input.containsKey(field.name()) && !input.hasValue(field) && loan.hasValue(field)) {
        logger.warn("MOSO-16590: removing lender-issued field " + field.name() + " on loan "
                + loan.get(Loan.id) + " (previous value '" + loan.get(field) + "') by user "
                + currentUsernameForLog());
        loan.remove(field);
        input.remove(field);
      }
    }
  }

  public static void ensureLoanProgram(Bundle bundle, HasValues loan) {
    if (Strings.isNotEmpty(loan.get(Loan.loan_program)) || !loan.hasValue(Loan.loan_program_id)) {
      return;
    }
    Long programId = loan.get(Loan.loan_program_id);
    Bean program = bundle.get(LoanProgram.TYPE, programId);
    String name = program != null ? program.get(LoanProgram.name) : LoanProgramType.getLoanProgramFromID(programId);
    if (Strings.isEmpty(name)) {
      logger.warn("Cannot derive loan_program from loan_program_id " + programId + " on loan " + loan.get(Loan.id));
      return;
    }
    loan.set(Loan.loan_program, name);
  }

  private static String currentUsernameForLog() {
    try {
      return Server.currentUser() != null ? Server.getCurrentUsername() : "system";
    } catch (Exception e) {
      return "unknown";
    }
  }

  public static void updateLenderModes(Bean lender, String ppeid) {
    String ns = NS.get();
    if (Strings.isNotEmpty(ppeid)) {
      lender.add(Lender.modes, true, ns);
    } else {
      lender.remove(Lender.modes, ns);
    }
  }

  public static Bean getHeadQuarterBranch(Long zip) {
    Bean headquarterBranch = new Bundle().get(Branch.TYPE, 1L);
    return headquarterBranch != null ? headquarterBranch : getNearestBranch(zip);
  }

  public static Bean getNearestBranch(Long zip) {
    Bundle bundle = new Bundle();
    List<Bean> branches = bundle.find(Branch.TYPE).whereEquals(Branch.active, true).list();
    Long nearestLocation = null;

    if (branches.size() == 1) {
      return branches.get(0);
    }

    List<Long> zipcodes = branches.stream()
            .filter(item -> item.hasValue(Branch.zip))
            .map(Branch.zip)
            .distinct()
            .collect(Collectors.toList());

    List<List<Long>> zipPages = getPage(zipcodes, 24);
    for (List<Long> zipCode : zipPages) {
      List<Long> modifiedZipCode = new ArrayList<>(zipCode);
      if (nearestLocation != null) {
        modifiedZipCode.add(nearestLocation);
      }
      nearestLocation = GoogleMap.instance().nearestLocation(zip, modifiedZipCode);
    }

    final Long finalNearestLocation = nearestLocation;
    return branches.stream().filter(branch -> branch.is(Branch.zip, finalNearestLocation))
            .findFirst().orElse(branches.get(0));
  }

  public static List<List<Long>> getPage(List<Long> zipCodes, Integer pageSize) {
    if (zipCodes == null) {
      return Collections.emptyList();
    }

    if (pageSize == null || pageSize <= 0 || pageSize > zipCodes.size()) {
      pageSize = zipCodes.size();
    }

    int numPages = (int) Math.ceil((double) zipCodes.size() / (double) pageSize);
    List<List<Long>> pages = new ArrayList<List<Long>>(numPages);
    for (int pageNum = 0; pageNum < numPages; pageNum++) {
      pages.add(zipCodes.subList(pageNum * pageSize, Math.min((pageNum + 1) * pageSize, zipCodes.size())));
    }
    return pages;
  }

  public static void resetLoanData(Bean loan) {
    ArrayList<Field> fieldsToReset = new ArrayList<>();
    fieldsToReset.addAll(Arrays.asList(earliest_signing_date, earliest_signing_date_tz, earliest_signing_date_timestamp, dead, funded, appraised_value, appraisal_report_fee,
            workflow_tasks, next_tasks, locked_rate, death, death_note, archive_reason, ordered_appraisal, appraisal_entered, appraisal_ordered, final_date_tz, lock_key, number_active_liens_found, person_placed_the_judgement, wa_rate_lock_agreement_file, uploaded_rate_sheet_files, paid_by_the_loan_officer));
    for (Field f : fieldsToReset) {
      if (loan.hasValue(f)) {
        loan.resetField(f);
      }
    }
    HasValues documentLink = loan.get(Loan.document_links, FieldsBase.create());
    if (documentLink.isNotBlank()) {
      documentLink.remove(wa_rate_lock_agreement);
    }
    loan.set(appraisal_ordered, AppraisalStatus.No);
    loan.set(appraised_value, loan.get(property_value));
    loan.set(Loan.status_changed, new Date());
    loan.set(Loan.document_links, documentLink);
    if (loan.is(Loan.has_alert) && loan.get(Loan.alert_status) == AlertStatus.Disabled) {
      loan.set(Loan.alert_status, AlertStatus.Active);
    }
  }

  public static void updateUpdatedDate(Bean loan) {
    if (!LoanStatus.isFinal(loan)) {
      loan.set(HasKey.updated, new Date());
    }
  }

  public static void ensureLockExpirationDate(JSON values) {
    String lockExpirationTz = values.get(Loan.lock_expiration_tz);
    if (lockExpirationTz != null) {
      String holiday = Dates.dates.getUsBankHoliday(lockExpirationTz);
      if (holiday != null) {
        logger.warn(lockExpirationTz + " is " + holiday);
      }
    }
  }

  public static void lock(Bean loan, JSON values, boolean sendEmail) throws Exception {
    // reset alert
    Field[] quoteFields = {Quote.loan_program, Quote.impounds, locked_rate};
    loan.copyFrom(values, quoteFields);
    if (loan.isChanged(Quote.impounds)) {
      updateAdjustment(loan, false);
    }
    IKey lockKey = loan.getKey(Loan.lock_key);
    final Bundle bundle = loan.bundle();
    final Bean lock = lockKey == null ? loan.bundle().createWithKey(Lock.TYPE) : bundle.demand(lockKey);
    if (values.hasValue(Loan.lock_key.dot())) {
      lock.copyFrom(values.get(Loan.lock_key.dot()), Arrays.asList(Lock.locked_cost, Lock.locked_point));
    }

    if (loan.hasValue(Loan.lender_id)) {
      lock.set(Lock.lock_extension, loan.get(Loan.lender_id.dot(Lender.lock_extension)));
      lock.set(Lock.relock, loan.get(Loan.lender_id.dot(Lender.relock)));
    }

    lock.set(created, new Date());
    loan.setRef(Loan.lock_key, lock);
    //This case when user request lock from ticket view
    if (values.is(Loan.requested_lock_by_ticket)) {
      loan.set(Loan.locked, true);
      Bean lockWorkflowTask = bundle.find(WorkflowTask.TYPE)
              .whereEquals(WorkflowTask.loan, loan.id())
              .whereEquals(WorkflowTask.pattern, LoanWorkFlows.getHeader(loan) + "lock").single();
      lockWorkflowTask.set(WorkflowTask.cleared, true);
      values.remove(Loan.requested_lock_by_ticket);
    }

    ensureLockExpirationDate(values);
    loan.set(Loan.lock_expiration_tz, values.get(Loan.lock_expiration_tz));
    Server.queueService(QueueType.LOAN).addTask(CheckAppraisalOrderedOp.class, JSON.empty().set(Loan.id, loan.id()), Dates.ONE_HOUR * 96);
    final Bean processor = loan.load(Loan.processor);
    loan.set(Loan.target_rate, values.get(Loan.locked_rate));
    updateCommissionPercentFromLA(loan);
    //disable alerts in Loan.afterSave
    findAndCompleteTheLockRequest(bundle, loan);
    if (sendEmail) {
      loan.addEvent("Rate Locked Confirmation", JSON.empty().set("note", values.get(Loan._note)).toJSONString());
    }
  }

  public static void findAndCompleteTheLockRequest(Bundle bundle, Bean loan) {
    List<Bean> tickets = bundle.find(Ticket.TYPE)
            .whereEquals(Ticket.parent_id, loan.id())
            .whereEquals(Ticket.type, TicketType.lock_request)
            .list();

    for (Bean ticket : tickets) {
      ticket.journal("Loan locked");
      if (ticket.is(Ticket.active)) {
        ticket.set(Ticket.status, TicketStatus.Completed);
      }
    }
    bundle.commit();
  }

  private static void deactivateAlerts(final Bean loan) {
    deactivateAlerts(loan, true);
  }

  private static void deactivateAlerts(Bean loan, boolean generateEvent) {
    // TODO now: move to events
    int size = getClientAlertByLoan(loan)
            .update((Action<Bean>) alert ->
                    disableAlert(alert, generateEvent));
    if (size > 0) {
      logger.info("Set " + size + " alerts to expired" + email);
    }
    if (loan.hasValue(Loan.has_alert)) {
      disableAlert(loan, generateEvent);
    }
  }

  private static QueryBuilder<Bean> getClientAlertByLoan(Bean loan) {
    return new Bundle().find(Loan.TYPE)
            .whereEquals(Loan.has_alert, true)
            .whereEquals(Loan.email, loan.get(Loan.email))
            .whereEquals(Loan.label, Alert.BORROWER_LABEL)
            .whereEquals(Loan.loan_amount, loan.get(Loan.loan_amount));
  }

  public static void disableAlert(Bean alert, boolean generateEvents) {
    // Pylon's product stays selected after the alert is turned off (disable,
    // rate-lock, expiration), so the displayed current cost must survive —
    // turning the alert off only stops the email. Don't touch cost/measure or
    // the cost_updated timestamp for Pylon; just flip the status below. Check
    // both alert_lender and the authoritative lender_id (alert_lender can lag).
    boolean isPylon = alert.is(Loan.alert_lender, LenderType.Pylon)
            || alert.is(Loan.lender_id, LenderType.Pylon.id());
    if (!isPylon) {
      alert.set(Alert.current_cost, null);
      alert.set(Alert.measure, null);
      alert.set(Alert.measure_type, null);
      alert.set(Alert.cost_updated, new Date());
    }

    if (alert.is(Loan.has_alert)) {
      if (alert.hasValue(Loan.alert_status) && alert.isNot(Loan.alert_status, Disabled)) {
        alert.set(Loan.alert_status, Disabled);

        if (generateEvents) {
          alert.addEvent(Loan.ALERT_DISABLED);
        }
      }
    } else {
      alert.remove(Loan.alert_status);
    }
  }

  public static void deleteAlert(Bean loan) {
    if (loan.is(Loan.has_alert)) {
      Field[] fieldToReset = {Alert.current_cost, Alert.target_cost, Alert.target_rate, Alert.expiration, Alert.alert_status};
      loan.removeAll(fieldToReset);
      loan.set(Loan.has_alert, false);
      loan.remove(Loan.quote_lender);
    }
  }

  public static void resetAlert(Bean loan) {
    if (loan.is(Loan.has_alert)) {
      loan.set(Loan.alert_status, Active);
      if (!loan.hasValue(Loan.quote_lender)) {
        loan.set(Loan.quote_lender, LenderType.fromId(loan.get(Loan.lender_id)));
      }
      loan.save();
    }

  }

  protected static boolean isLocked(Bean alert) {
    return LoanUtils.isLoan(alert) && alert.is(Loan.locked);
  }

  public static void onPurposeChanged(Bean loan, JSON values) throws IOException {
    final PurposeType purpose = loan.demand(Loan.purpose, "Purpose is required");
    if (purpose.isRealEstate() ||
            !(purpose.equals(PurposeType.PA) || purpose.equals(PurposeType.PQ) || purpose.equals(PurposeType.PM))) {
      int i = 0;
      for (FK<Long> fk : new FK[]{Loan.buyer_agent, Loan.listing_agent, Loan.escrow, Loan.seller, Loan.fire_hazard}) {
        Long id = loan.get(fk);
        if (!fk.equals(Loan.escrow) || !Strings.isEmpty(values.get(fk.dot(Realtor.email)))) {
          Type type = i < 2 ? Realtor.TYPE : Contact.TYPE;
          Bean bean = id == null ? loan.bundle().createWithKey(type) : loan.load(fk);
          if (isNullContact(JSON.empty().copyFrom(values, fk.dot()).values())) {
            bean.deleteOnCommit();
            loan.set(fk, null);
          } else {
            if (fk.equals(Loan.buyer_agent) && loan.hasValue(Loan.document_links)) {
              changeFilePermissionForBuyerAgent(loan.get(Loan.document_links), values.get(Loan.buyer_agent.dot(email), ""), bean.get(email, ""));
            }

            for (Field f : type.fields()) {
              bean.set(f, values.get(fk.dot(f)));
            }
            if (i < 2) {
              bean.set(Realtor.state, loan.get(Loan.state))
                      .set(Realtor.nationality, values.get(fk.dot(Realtor.nationality)));
            }
            if (id == null) {
              loan.set(fk, bean.id());
            }
          }
        }
        i++;
      }
    }
  }

  public static void changeFilePermissionForBuyerAgent(HasValues documentLinks, String newEmail, String oldEmail) throws IOException {
    if (!newEmail.equalsIgnoreCase(oldEmail)) {
      String letter = documentLinks.get(PreApprovalLetter.pre_approval_letter, "");
      if (!letter.isEmpty()) {
        GoogleDrive drive = getInstance();
        File file = drive.find(letter);

        if (file != null) {
          PermissionService service = drive.permission(file);
          if (!oldEmail.isEmpty()) {
            service.deletePermissionOfEmail(GoogleDriveRole.reader, oldEmail).commit();
          }
          if (!newEmail.isEmpty()) {
            service.addUser(GoogleDriveRole.reader, newEmail).commit();
          }
        }
      }
    }
  }

  private static boolean isNullContact(Collection<Object> values) {
    values.removeAll(Collections.singleton(null));
    return values.isEmpty();
  }

  public static void onLenderChanged(Bean loan) {
    pickAlertLender(loan);
    if (shouldUpdateWorkflow(loan)) {
      changeWorkflow(loan);
    }
  }

  public static boolean shouldUpdateWorkflow(Bean bean) {
    if (bean.isChanged(Loan.lender_id)) {
      return true;
    }

    return !LoanWorkFlows.getWorkflow(bean).equals(LoanWorkFlows.getWorkflow(bean.getFullOldValues()));
  }

  /**
   * reset workflow and delete alert. DON'T SAVE
   *
   * @param loan
   */
  public static void changeWorkflow(Bean loan) {
    WorkflowTaskOp.resetWorkflow(loan);
    deleteAlert(loan);
    resetLoanData(loan);
  }

  private static void updateQuoteLender(Bean loan) {
    Long id = loan.get(Loan.lender_id);
    Bean la = new Bundle().get(LenderAgreement.TYPE, id);
    if (la != null && la.is(LenderAgreement.active)) {
      loan.set(Loan.quote_lender, LenderType.fromId(id));
    } else {
      loan.remove(Loan.quote_lender);
    }
  }

  public static void updateCommissionPercentFromLA(Bean loan) {
    loan.journal("Update commission percent");
    String state = loan.get(Loan.state);
    Long lender = loan.get(Loan.lender_id);

    Bean lenderAgreement = new Bundle().demand(LenderAgreement.TYPE, lender);
    HasValues rebate = findCompensation(loan.get(Loan.branch), state, lenderAgreement
            .get(LenderAgreement.rebates), RebatesRow.state);
    if (rebate != null) {
      if (loan.hasValue(Loan.loan_lpc)) {
        loan.set(Transaction.flat_processing_fee, rebate.get(RebatesRow.flat_processing_fee))
                .set(Transaction.commission_percent, loan.get(Loan.loan_lpc));
      } else {
        Double lpc = QuoteUtils.getLPC(rebate, loan.get(Loan.purpose));
        if (lpc != null) {
          loan.set(Transaction.flat_processing_fee, rebate.get(RebatesRow.flat_processing_fee))
                  .set(Transaction.commission_percent, lpc);
        }
      }
    }
  }

  static void updateOwners(final Bean loan, final boolean fireEvent) {
    // TODO originator_assistant NewLoanForm(RE)
    loan.require(Loan.agent, Loan.processor);
    if (loan.isChanged(Loan.processor)) {
      final Bean processor = loan.load(Loan.processor);
      LinkedList<Field> teamFields = HasTeam.TYPE.fields();
      teamFields.remove(HasBranch.branch);
      teamFields.remove(HasBranch.branch_name);
      loan.copyFrom(processor, teamFields);
    }
    if (!loan.hasValue(Loan.branch) || (loan.isChanged(Loan.agent) && loan.isNot(Loan.agent, Server.getCompany().get(Company.owner_key_name)))) {
      final Bean agent = loan.load(Loan.agent);
      loan.copyFrom(agent, HasBranch.branch, HasBranch.branch_name);
    }
  }

  public static Bean pickAlertLender(Bean loan) {
    Bean lender = loan.load(Loan.lender_id);
    if (lender != null) {
      final LenderType lenderType = LenderType.fromId(lender.id());
      if (lenderType != null) {
        loan.set(Alert.alert_lender, lenderType);
      }
    }
    return lender;
  }

  public static void sendSigningAppointmentEmail(Bean loan) {
    JSON payload = JSON.empty();
    if (loan.get(Loan.escrow_company) == null) {
      loan.demand(escrow, "Please enter escrow information before setting signing appointment.");
      Bean escrow = loan.load(Loan.escrow);
      payload.set("escrowsEmails", (escrow.get(Contact.email_name)));
    } else {
      final String company = loan.get(Loan.escrow_company);
      List<String> escrowsEmails = getPrelimEscrowEmails(company);
      payload.set("escrowsEmails", escrowsEmails);
      List<String> backupEscrowsEmails = getBackupPrelimEscrowEmails(company);
      payload.set("backupEscrowsEmails", backupEscrowsEmails);
    }
    payload.set("currentUser", getCurrentUserPayload(Server.currentUser()))
            .set("signingNote", loan.get(Loan.signing_note, "").isEmpty() ? "" : "<br/>Note: " + loan.get(Loan.signing_note))
            .set("notaryName", loan.get(Loan.notary_name, "").isEmpty() ? "" : "<br/>Notary name: " + loan.get(Loan.notary_name))
            .set("notaryPhone", loan.get(Loan.notary_phone, "").isEmpty() ? "" : "<br/>Notary phone: " + loan.get(Loan.notary_phone));
    loan.save();
    loan.bundle().addEvent(loan.key(), "Signing Appointment", payload.toJSONString());
  }

  public static String getCurrentUserPayload(SessionUser sessionUser) {
    String sessionUserCompany = "";
    if (sessionUser.typeis(Escrow.TYPE)) {
      sessionUser.demand(Escrow.company_key, "Missing Escrow's Company");
      sessionUserCompany = new Bundle().demand(sessionUser.get(Escrow.company_key))
              .get(EscrowCompany.name);
    }
    sessionUser.set(User.organization, sessionUserCompany);
    return sessionUser.toJSONString();
  }

  public static List<String> getBorrowersEmailNames(HasValues loan) {
    List<String> borrowerEmails = getBorrowersInformation(loan, Loan.email_name);
    if (loan.hasValue(Loan.borrowers) && loan.hasValue(Alert.additional_emails)) {
      borrowerEmails.addAll(loan.get(Alert.additional_emails));
    }
    return borrowerEmails;
  }

  public static <T> List<T> getBorrowersInformation(HasValues loan, Field<T> infoField) {
    Set<T> borrowerEmails = new HashSet<>();
    List<HasValues> additionalBorrowers = loan.loadList(Loan.borrowers);
    if (loan.hasValue(infoField)) {
      borrowerEmails.add(loan.get(infoField));
    }
    if (Colls.isNotEmpty(additionalBorrowers)) {
      for (HasValues borrower : additionalBorrowers) {
        if (borrower.hasValue(infoField)) {
          borrowerEmails.add(borrower.get(infoField));
        }
      }
    }
    return new ArrayList<>(borrowerEmails);
  }

  public static <T> List<T> getTransactionInfomations(HasValues loan, List<Field<T>> infoFields) {
    List<T> transactionInfo = new LinkedList<>();
    for (Field<T> infoField : infoFields) {
      if (loan.hasValue(infoField)) {
        transactionInfo.add(loan.get(infoField));
      }
    }
    return transactionInfo;
  }

  public static List<String> getEmailToSendOrderAppraisal(HasValues bean) {
    if (bean.hasValue(Loan.purpose)) {
      List<String> emails = LoanOps.getBorrowersEmailNames(bean);
      if (bean.get(Loan.purpose).isPM() && bean.get(Loan.buyer_agent) != null) {
        emails.add(bean.get(Loan.buyer_agent.dot(Contact.email_name)));
        if (bean.hasValue(Loan.additional_buyer_agents)) {
          for (HasValues agent : bean.get(Loan.additional_buyer_agents)) {
            emails.add(agent.get(Contact.email_name));
          }
        }
      }
      return emails;
    }
    return new ArrayList<>();
  }

  public static List<String> getBuyerAgentsEmailNames(HasValues bean) {
    List<String> emails = new ArrayList<>();
    if (bean.hasValue(Loan.buyer_agent)) {
      emails.add(bean.get(Loan.buyer_agent.dot(Contact.email_name)));
      if (bean.hasValue(Loan.additional_buyer_agents)) {
        emails.addAll(bean.get(Loan.additional_buyer_agents).stream().map(agent -> agent.get(Contact.email_name))
                .collect(Collectors.toList()));
      }
    }
    return emails;
  }

  public static List<String> getListingAgentsEmailNames(HasValues bean) {
    List<String> emails = new ArrayList<>();
    if (bean.hasValue(Loan.listing_agent)) {
      emails.add(bean.get(Loan.listing_agent.dot(Contact.email_name)));
      if (bean.hasValue((Loan.additional_listing_agents))) {
        emails.addAll(bean.get(Loan.additional_listing_agents).stream().map(agent -> agent.get(Contact.email_name))
                .collect(Collectors.toList()));
      }
    }
    return emails;
  }

  public static List<String> getPrelimEscrowEmails(String company) {
    return getEscrowEmails(null, company, EscrowTask.InputFeesAndSetupSigningAppointment);
  }

  private static List<String> getBackupPrelimEscrowEmails(String company) {
    return getEscrowEmails(null, company, EscrowTask.BackupInputFeesAndSetupSigningAppointment);
  }

  public static List<String> getEscrowEmails(Bean loan, String company, EscrowTask task) {
    if (loan == null && Strings.isNotEmpty(company)) {
      List<String> emails = new ArrayList<>();
      Bundle bundle = new Bundle();
      Bean escrowCompany = bundle.get(company);
      if (escrowCompany != null && escrowCompany.hasValue(EscrowCompany.email)) {
        emails.add(escrowCompany.get(EscrowCompany.email));
      }
      List<Bean> escrows = bundle.find(Escrow.TYPE).whereEquals(Escrow.company_key, company).list();
      if (Colls.isNotEmpty(escrows)) {
        emails.addAll(escrows.stream().map(e -> e.get(email_name)).toList());
        return emails;
      }
    }
    return getEscrowInfos(loan, Escrow.email_name);
  }

  public static <T> List<T> getEscrowInfos(Bean loan, Field<T> infoField) {
    List<T> result = new ArrayList<>();
    if (loan != null) {
      if (loan.hasValue(Loan.escrow)) {
        Bean escrow = loan.load(Loan.escrow);
        if (escrow != null && escrow.hasValue(infoField)) {
          result.add(escrow.get(infoField));
        }
      }
      if (loan.hasValue(Loan.additional_buyer_escrows)) {
        final List<HasValues> escrows = loan.get(Loan.additional_buyer_escrows);
        for (final HasValues escrow : escrows) {
          if (escrow.hasValue(infoField)) {
            result.add(escrow.get(infoField));
          }
        }
      }
      if (loan.hasValue(Loan.escrow_company)) {
        Bean escrowCompany = loan.load(Loan.escrow_company);
        if (escrowCompany != null && escrowCompany.hasValue(infoField)) {
          result.add(escrowCompany.get(infoField));
        }
      }
    }
    return result;
  }

  public static <T> List<T> getAssociatesInfos(Bean loan, Field<T> infoField) {
    List<T> result = new ArrayList<>();
    if (loan != null) {
      if (loan.hasValue(Loan.agent)) {
        Bean lo = loan.load(Loan.agent);
        if (lo != null && lo.hasValue(infoField)) {
          result.add(lo.get(infoField));
        }
      }
      if (loan.hasValue(Loan.originator_assistant)) {
        Bean loa = loan.load(Loan.originator_assistant);
        if (loa != null && loa.hasValue(infoField) && !result.contains(loa.get(infoField))) {
          result.add(loa.get(infoField));
        }
      }
      if (loan.hasValue(Loan.setup_specialist)) {
        Bean lp = loan.load(Loan.setup_specialist);
        if (lp != null && lp.hasValue(infoField) && !result.contains(lp.get(infoField))) {
          result.add(lp.get(infoField));
        }
      }
    }
    return result;
  }

  public static void executeAction(final Bean loan, JSON input) {
    //TODO : move to Loan.afterSave
    List<String> actions = input.get(Loan.action);
    if (actions.contains(Loan.funded.name())) {
      deactivateAlerts(loan, false);
      if (!LOANTOWN.equals(App.ns())) {
        Server.queueService(QueueType.LOAN).addTask(CreatePendingAlertForFundedLoan.class, JSON.empty().set(Loan.key, loan.key()));
      }
    }

    if (!loan.get(Loan.purpose).isRealEstate()) {
      final boolean isProcessingLoan = loan.hasValue(Loan.processor) && loan.load(Loan.processor).is(Admin.processing_loan);
      final boolean noAppraisal = loan.is(Loan.appraisal_ordered, AppraisalStatus.No);
      if (isProcessingLoan && noAppraisal && input.is(Loan.clear_to_close)) {
        throw new ErrorMessage("Appraisal has to be ordered before closing the loan");
      }
    }
    if (actions.contains(Loan.dead.name())) {
      loan.journal("Dead", true);
      if (loan.is(Loan.has_alert)) {
        loan.set(Loan.email_options, SubscriptionType.Disabled);
      }
      loan.set(Loan.hit, 0);
      createLoanNote(loan, input.get(Loan.death_note));
      if (!Active.equals(loan.get(Loan.alert_status))) {
        deactivateAlerts(loan);
      } else {
        int updatedAlert = getClientAlertByLoan(loan).update(item -> {
          item.set(Alert.hit, 0);
          return item.isChanged();
        });
        if (updatedAlert > 0) {
          logger.info("Reset " + updatedAlert + " alerts belong to " + email);
        }
      }
    }
    for (String action : actions) {
      loan.set(action, true);//Change Loan Flag here
    }
  }

  //TODO: milestones
  public static void createChangeStatusNote(LoanStatus oldLoanStatus, Bean loan, String content) {
    String newContent = "Change status: <b>" + oldLoanStatus + " --> " + loan.get(Loan.status) + "</b><br/> Reason: " + content;
    createNote(loan, newContent, Loan.LOAN_NOTE, Loan.loan_last_note, new ArrayList<>());
  }

  public static void createLoanNote(final CanBeStored loan, final String content) {
    createLoanNote(loan, content, null);
  }

  public static void createLoanNote(final HasValues loan, final String content, List<String> labels) {
    createLoanNote(loan, content, labels, null);
  }

  public static void createLoanNote(final HasValues loan, final String content, List<String> labels, String updatedUser) {
    if (Strings.isNotEmpty(content)) {
      if (Strings.isEmpty(loan.key())) {
        throw new IllegalArgumentException("Please always use bundle.createWithKey() for Loan.TYPE");
      }
      createNote(loan, content, Loan.LOAN_NOTE, Loan.loan_last_note, labels, updatedUser);
    }
  }

  public static void createNote(final HasValues loan, String content, String type,
                                Field<Long> lastNoteField, List<String> labels) {
    createNote(loan, content, type, lastNoteField, labels, null);
  }

  public static void createSystemNote(final HasValues loan, final String content, List<String> labels) {
    if (Strings.isNotEmpty(content)) {
      if (Strings.isEmpty(loan.key())) {
        throw new IllegalArgumentException("Please always use bundle.createWithKey() for Loan.TYPE");
      }
      Bean note = _createNote(loan, content, Loan.LOAN_NOTE, labels, null);
      note.set(Note.system, true);
      note.save();
      loan.set(Loan.loan_last_note, note.id());
    }
  }

  private static Bean _createNote(final HasValues loan, String content, String type,
                                  List<String> labels, String updatedUser) {
    Bean note = new Bundle().createWithKey(Note.TYPE);
    note.set(Note.content, content.replaceAll(System.lineSeparator(), "<br/>"))
            .set(Note.type, type)
            .set(Note.container, loan.key());
    if (loan.hasValue(Loan.processor)) {
      note.add(Note.labels, loan.get(Loan.processor.dot(Admin.email)));
    }
    if (loan.hasValue(Loan.agent)) {
      note.add(Note.labels, loan.get(Loan.agent.dot(Admin.email)));
    }
    if (labels != null) {
      note.add(Note.labels, true, labels);
    }
    if (updatedUser != null) {
      note.set(HasKey.updated_user, updatedUser);
    }
    note.add(Note.labels, Admin.TYPE.name());
    return note;
  }


  public static void createNote(final HasValues loan, String content, String type,
                                Field<Long> lastNoteField, List<String> labels, String updatedUser) {
    if (Strings.isNotEmpty(content) && Strings.isNotEmpty(loan.key())) {
      Bean note = _createNote(loan, content, type, labels, updatedUser);
      note.save();
      loan.set(lastNoteField, note.id());
    }
  }

  public static void createLoanNotForToFollowUp(final CanBeStored<?> toFollowUp, final String content, List<String> labels, String updatedUser) throws Exception {
    CanBeStored<?> container = toFollowUp.load(ToFollowUp.container);
    if (container != null) {
      String updatedContent = "To Follow up on: <b>" + toFollowUp.display(ToFollowUp.wakeup_date_tz) + "</b> \n" + content;
      if (container.typeis(Marketing.TYPE)) {
        createNote(container, updatedContent, Marketing.TYPE.name(), Marketing.last_note, null, updatedUser);
      } else if (container.typeis(Loan.TYPE)) {
        createNote(container, updatedContent, Loan.LOAN_NOTE, Loan.loan_last_note, labels, updatedUser);
      } else if (container.type().hasField(HasLastNote.last_note)) {
        SaveGenericNoteOp saveNoteOp = container.typeis(Admin.TYPE)
                ? new SaveAdminAndInterestedLoanOfficerNoteOp()
                : new SaveGenericNoteOp();
        saveNoteOp.execute(JSON.empty()
                .set(Note.container, container.key())
                .set(Note.content, updatedContent.replaceAll(System.lineSeparator(), "<br/>"))
                .set(SaveGenericNoteOp.update_container_last_note, false)
                .set(Note.labels, labels));
      }
    }
  }

  public static List<String> loadNotes(Bean loan, String type) {
    return new Bundle().find(Note.TYPE)
            .whereEquals(Note.container, loan.key())
            .whereEquals(Note.type, type)
            .map(Note.content);
  }

  public static void setupSigningAppointment(Bean loan) {
    if (loan.is(Loan.doc_at_title) && LoanUtils.shouldSendEmail(loan)) {
      loan.setTimeZone();
      StringBuilder escrowsEmails = new StringBuilder();
      StringBuilder escrowsNames = new StringBuilder();
      StringBuilder escrowsContacts = new StringBuilder();
      Bean escrowCompany = null;
      String escrowCompanyName = null;
      Bundle bundle = new Bundle();
      if (loan.get(Loan.escrow_company) == null) {
        Bean escrow = loan.load(Loan.escrow);
        escrowsEmails.append(escrow.get(Contact.email_name));
        escrowsNames.append(escrow.get(Contact.full_name));
        escrowsContacts.append(escrow.get(Contact.full_name)).append(" (Phone:").append(escrow.get(Contact.phone)).append(")");
        escrowCompanyName = escrow.get(Escrow.organization);
      } else {
        final String company = loan.get(Loan.escrow_company);
        List<Bean> escrows = bundle.find(Escrow.TYPE).where(Escrow.company_key, CompareType.EQUAL, company).list();
        List<Bean> escrowWithNoSetupAppointmentTask = new ArrayList<>();
        for (Bean escrow : escrows) {
          if (!escrow.is(Escrow.active) || (!escrow.has(Escrow.tasks, EscrowTask.InputFeesAndSetupSigningAppointment.name())
                  && !escrow.has(Escrow.tasks, EscrowTask.BackupInputFeesAndSetupSigningAppointment.name()))) {
            escrowWithNoSetupAppointmentTask.add(escrow);
          }
        }
        escrows.removeAll(escrowWithNoSetupAppointmentTask);
        if (!escrows.isEmpty()) {
          for (int i = 0; i < escrows.size(); i++) {
            Bean escrow = escrows.get(i);
            escrowsEmails.append(escrow.get(Escrow.email_name));
            escrowsNames.append(escrow.get(Escrow.full_name));
            escrowsContacts.append(escrow.get(Escrow.full_name)).append("(Phone: ").append(escrow.get(Escrow.phone)).append(")");
            if (i != escrows.size() - 1) {
              escrowsContacts.append(" or ");
              escrowsNames.append(" or ");
              escrowsEmails.append(",");
            }
          }
          escrowCompany = bundle.demand(company);
        }
      }
      if (!loan.is(Loan.should_not_send_email)) {
        if (!escrowsEmails.toString().isEmpty()) {
          HashMap<String, Object> context = new HashMap<>();
          context.put("root", loan);
          OpRegistry.get(EmailAllOp.class).sendUsingTemplate("setup_signing_appointment", context);
        } else { // no escrow user with task: InputFeesAndSetupSigningAppointment in the company, email Admin to notify about this:
          StringBuilder subject = new StringBuilder();
          subject.append("Warning: Missing Closing Agent with Task Setup Signing Appointment.");
          if (loan.hasValue(Loan.loan_number)) {
            subject.append(" Loan#: " + loan.get(Loan.loan_number) + ",");
          }
          subject.append(" Borrower: " + loan.load(Loan.main_borrower).get(Borrower.full_name));

          StringBuilder body = new StringBuilder("This escrow company ");
          String escrowName = loan.load(Loan.escrow_company).get(EscrowCompany.name);
          body.append("<a href=\"" + Server.baseUrl() + "/escrows" + (escrowName == null ? "" : "?_e=" + loan.load(Loan.escrow_company).key()) + "\" >" + escrowName + "</a>");
          body.append(" does not have any closing agent with the role <b>Input Fees - Setup Signing Appointment</b>" +
                  ". Make sure to update at least one closing agent with this role for this company.");

          Server.emailService().send(new EmailOptions(subject.toString())
                  .withBody(body.toString())
                  .to(Server.getCompany().get(Company.owner_company_email_name)).labels(Arrays.asList(loan.id().toString())));
        }
      }
    }
  }

  public static boolean recordReferral(JSON values, Bean loan) {
    final String referring = values.getRaw(Loan.referring_agent.name());
    if (!Strings.isEmpty(referring)) {
      int count = loan.bundle().find(Realtor.TYPE)
              .whereEquals(Realtor.email, referring.toLowerCase()).count(1);
      if (count == 0) {
        return true;
      } else {
        final JSON options = JSON.make(Loan.referring_agent, referring);
        Server.queueService().addTask(RecordReferralOp.class, options);
      }
    }
    return false;
  }

  private static void updateAdjustment(Bean loan, boolean shouldNotifyUser) {
    Double oldAdjustment = loan.get(Loan.adjustment);
    if (oldAdjustment != null) { // only if loan has alert
      LenderType lender = LenderType.fromId(loan.get(Loan.lender_id));
      if (lender == null) {
        loan.set(Loan.adjustment, null);
      } else if (QuoteUtils.isNonQM(loan)) {
        HasValues result;
        try {
          final JSON quoteParameters = loan.toMap(NON_QM_QUOTE_FIELDS).set(Quote.quote_lender, lender);
          if (loan.hasValue(Loan.appraised_value)) {
            quoteParameters.set(Quote.property_value, loan.get(Loan.appraised_value));
          }
          HasValues alertRate = loan.subMap(Rate.loan_program, Rate.loan_type, Rate.non_qm_product, Rate.mode)
                  .set(Rate.interest_rate, loan.get(Loan.target_rate, loan.get(Rate.interest_rate)));
          result = MosoPricingAPI.computeAdjustment(quoteParameters, alertRate);
        } catch (Throwable e) {
          logger.warn("Could not calculate adjustment: " + e.getMessage());
          return;
        }
        if (result.isNotBlank()) {
          if (result.containsKey(SharedConstants.ERROR)) {
            throw new ErrorMessage(result.getRaw(SharedConstants.ERROR));
          }
          Double adjustment = result.get(Loan.adjustment);
          if (!oldAdjustment.equals(adjustment)) {
            loan.set(Loan.adjustment, adjustment);
            if (shouldNotifyUser) {
              onAdjustmentChanged(loan, oldAdjustment);
            }
          }
        }
      } else if (LoanType.ALL_TYPE_NOT_NON_QM.contains(loan.get(Loan.loan_type))) {
        HasValues result;
        try {
          final JSON quoteParameters = loan.toMap(QUOTE_FIELDS).set(Quote.quote_lender, lender);
          if (loan.hasValue(Loan.appraised_value)) {
            quoteParameters.set(Quote.property_value, loan.get(Loan.appraised_value));
          }
          HasValues alertRate = loan.subMap(Rate.loan_program, Rate.loan_type, Rate.mode)
                  .set(Rate.interest_rate, loan.get(Loan.target_rate, loan.get(Rate.interest_rate)));
          result = MosoPricingAPI.computeAdjustment(quoteParameters, alertRate);
        } catch (Throwable e) {
          logger.warn("Could not calculate adjustment: " + e.getMessage());
          return;
        }
        if (result.isNotBlank()) {
          if (result.containsKey(SharedConstants.ERROR)) {
            throw new ErrorMessage(result.getRaw(SharedConstants.ERROR));
          }
          Double adjustment = result.get(Loan.adjustment);
          if (!oldAdjustment.equals(adjustment)) {
            loan.set(Loan.adjustment, adjustment);
            if (shouldNotifyUser) {
              onAdjustmentChanged(loan, oldAdjustment);
            }
          }
        }
      }
    }
  }

  public static void updateAdjustment(Bean loan) {
    updateAdjustment(loan, true);
  }

  public static void onAdjustmentChanged(Bean loan, Double oldAdjustment) {
    if (loan.is(Loan.locked) && !LoanStatus.isFinal(loan)) {
      loan.addEvent("Adjustment Changed", JSON.empty()
              .set("oldAdjustment", oldAdjustment).toJSONString());
    }
  }

  public static void cleanUpConditions(Bean loan) {
    final ClearTodoOp clearTodoOp = OpRegistry.get(ClearTodoOp.class);
    Bundle bundle = new Bundle();
    List<String> keys = bundle.find(Condition.TYPE)
            .whereEquals(Condition.loan_id, loan.id())
            .whereEquals(Condition.cleared, false)
            .keyOnly()
            .map(Condition.key);
    if (!keys.isEmpty()) {
      clearTodoOp.execute(JSON.make(Condition.key.s(), keys));
      bundle.commit();
    }
  }

  public static void notifyLoanClosedToGoogleAnalytics(Bean loan) {
    if (loan.isNot(Loan.ga_captured) && loan.hasValue(Loan.ga_client_id)) {
      try {
        boolean trackedLoanClosed = GoogleAnalyticsMeasurementUtil.trackConversionEvent(
                loan.get(Loan.ga_client_id),
                "loan_closed",
                loan,
                Loan.loan_amount,
                Loan.purpose, Loan.loan_type, Loan.loan_amount);
        if (trackedLoanClosed) {
          loan.set(Loan.ga_captured, true);
          loan.save();
        }
      } catch (Exception e) {
        Logger.getLogger("GoogleAnalytics").warn("Send closed loan notification to GA " + loan.id() + " failed!");
      }
    }
  }

  public static void clearConditions(long loanId, String[] name) {
    try {
      List<JSON> list = new Bundle().find(Condition.TYPE).whereEquals(Condition.loan_id, loanId)
              .whereEquals(Condition.cleared, false)
              .whereIn(Condition.details, name)
              .list(Condition.key);
      List<String> keys = list.stream().map(FieldsBase::key).collect(Collectors.toList());
      if (!keys.isEmpty()) {
        new ClearTodoOp().execute(JSON.empty().set(Condition.key.s(), keys));
      }
    } catch (Exception e) {
      //do not stick changing loan status
      Bucket.logTheException(e, "Can't clear condition for loan:" + loanId + ". Conditions:" + Arrays.toString(name));
    }
  }

  public static void clearCondition(long loanId, String name) {
    clearConditions(loanId, new String[]{name});
  }


  public static void createNewAlert(Bean loan) {
    if (!LoanType.ALL_TYPE_NOT_NON_QM.contains(loan.get(Loan.loan_type))) { // ignore if the loan is non-qm
      return;
    }
    JSON newAlert = JSON.empty().copyFrom(loan, Loan.ALERT_ONLY_FIELDS).copyFrom(loan, QUOTE_FIELDS);
    double newRate;
    CanBeStored config = new Bundle().demand(LoanConfiguration.TYPE, 1L);
    if (loan.get(Loan.loan_amount, 0d) >= config.get(LoanConfiguration.loan_amount_threshold, 200000d)) {
      newRate = loan.get(Loan.locked_rate, 3.5d) - config.get(LoanConfiguration.higher_threshold_rate, 0.25);
    } else {
      newRate = loan.get(Loan.locked_rate, 3.5d) - config.get(LoanConfiguration.lower_threshold_rate, 0.375);
    }
    if (newRate % 0.125 != 0) {
      newRate = Math.ceil(newRate / 0.125) * 0.125;
    }
    newAlert.set(Loan.alert_lender, null)
            .set(Alert.target_rate, newRate)
            .set(Loan.label, Alert.SYSTEM_LABEL);
    boolean hasOccupancy = loan.hasValue(Loan.occupancy);
    if (!hasOccupancy) {
      loan.set(Loan.occupancy, OccupancyType.Investment).set(Loan.category, LoanCategory.Conforming);
    }
    newAlert.copyFrom(loan, Loan.user);
    newAlert.set(Loan.purpose, PurposeType.Refinance)
            .set(Alert.email_options, AlertUtils.getEmailOptions(loan))
            .set(Loan.channel, LoanChannel.wholesale_lender)
            .set(Loan.dont_notify_borrower, false);
    newAlert.removeAll(Alert.alert_lender, Alert.quote_lender);
    newAlert.set(Alert.alert_status, Pending);
    if (loan.hasValue(Loan.agent)) {
      newAlert.set(Loan.agent, loan.get(Loan.agent))
              .set(Loan.from_funded_loan, true);
    }
    if (!newAlert.hasValue(Loan.target_cost)) {
      newAlert.set(Loan.target_cost, 0d);
    }
    try {
      CreateAlertOp createAlertOp = new CreateAlertOp();
      JSON result = createAlertOp.execute(newAlert);
      loan.set(Loan.alert, result.id());
      // We keep the alert for record but no need to display it in AlertsView anymore.
      loan.set(Loan.has_alert, false);
      loan.remove(Loan.expiration);
      loan.journal("Create pending alert for closed loan", true, true);
    } catch (Exception ex) {
      throw new IllegalStateException("Error while creating new alert for this funded loan", ex);
    }
  }

  public static QueryBuilder<Bean> loadHistories(Bean loan) {
    return new Bundle().find(History.TYPE).whereEquals(History.container, loan.key());
  }

  public static void createWorkflowTasks(Bean loan, String... tasks) {
    for (String task : tasks) {
      HasValues node = JSON.empty().set("name", task).set("independent", "True");
      LoanOps.createWorkflowTask(loan, node);
    }
  }

  /**
   * Used in js function. DON'T DELETE
   */
  public static void createWorkflowTasks(Bean loan, List<String> tasks) {
    for (int i = 0; i < tasks.size(); i++) {
      HasValues node = JSON.parse(tasks.get(i));
      LoanOps.createWorkflowTask(loan, node);
    }
    loan.save();
  }

  public static void updateFinishedWorkflowStatus(Bean loan) {
    Bundle bundle = new Bundle();
    List<JSON> list = bundle.find(com.mvu.loan.shared.entity.WorkflowTask.TYPE).whereEquals(WorkflowTask.loan, loan.id())
            .whereEquals(WorkflowTask.cleared, true).list(WorkflowTask.keyName);

    List<String> finishedStatus = new ArrayList<>();
    if (list != null) {
      for (JSON task : list) {
        finishedStatus.add(task.keyName());
      }
    }
    loan.set(Loan.finished_workflow_statuses, finishedStatus).save();
  }

  //Used in loan_created EL
  public static void updateTransactionCountingNumber(Bean loan) {
    if (Server.isTest()) {
      return;
    }
    List<String> modules = Server.configuration() == null ? Collections.emptyList()
            : Server.configuration().get(Configuration.modules, Collections.emptyList());
    if (!modules.contains("company_dashboard") &&
            "true".equals(Server.getSystemProperty("disable_realtime_performance_report_updating"))) {
      return;
    }
    ArrayList<String> listUserChecked = new ArrayList<>();
    Field<Integer> field = null;
    if (LoanUtils.isLead(loan)) {
      field = PerformanceReport.leads;
    } else if (LoanUtils.isLoan(loan)) {
      field = PerformanceReport.loans;
    } else if (LoanUtils.isProspect(loan)) {
      field = PerformanceReport.prospects;
    }
    if (field != null) {
      Bundle bundle = new Bundle();
      Bean companyCE = bundle.find(PerformanceReport.TYPE)
              .whereEquals(PerformanceReport.counting_type, CountingType.all)
              .single();
      updateNumber(companyCE, field);
      Bean branchCE = bundle.find(PerformanceReport.TYPE)
              .whereEquals(PerformanceReport.counting_type, CountingType.branch)
              .whereEquals(PerformanceReport.container, loan.get(Loan.branch.dot(HasKey.key)))
              .single();
      updateNumber(branchCE, field);
      if (loan.get(Loan.team) != null) {
        Bean teamCE = bundle.find(PerformanceReport.TYPE)
                .whereEquals(PerformanceReport.container, loan.get(Loan.team.dot(HasKey.key)))
                .single();
        updateNumber(teamCE, field);
      }

      String agent = loan.get(Loan.agent);
      Bean loCE = bundle.get(PerformanceReport.TYPE, PerformanceReportUtils.getReportKeyName(CountingType.lo, agent));
      updateNumber(loCE, field);
      listUserChecked.add(agent);

      if (loan.hasValue(Loan.processor)) {
        String processor = loan.get(Loan.processor);
        Bean proCE = bundle.get(PerformanceReport.TYPE, PerformanceReportUtils.getReportKeyName(CountingType.processor, processor));
        updateNumber(proCE, field);
        if (!listUserChecked.contains(processor)) {
          listUserChecked.add(processor);
        }
      }

      if (loan.hasValue(Loan.originator_assistant)) {
        String originatorAssistant = loan.get(Loan.originator_assistant);
        Bean loaCE = bundle.get(PerformanceReport.TYPE, PerformanceReportUtils.getReportKeyName(CountingType.lo_assistant, originatorAssistant));
        updateNumber(loaCE, field);
        if (!listUserChecked.contains(originatorAssistant)) {
          listUserChecked.add(originatorAssistant);
        }
      }

      String state = loan.get(Loan.state, null);
      Bean stateBean = bundle.get(PerformanceReport.TYPE, PerformanceReportUtils.getReportKeyName(CountingType.states, state));
      if (stateBean == null) {
        stateBean = new Bundle().create(PerformanceReport.TYPE, PerformanceReportUtils.getReportKeyName(CountingType.states, state))
                .set(PerformanceReport.counting_type, CountingType.states)
                .set(PerformanceReport.name, state != null ? States.states.get(state) : "No State")
                .set(PerformanceReport.additional_query, FieldsBase.create().set(PerformanceReport.state, state));
      }
      updateNumber(stateBean, field);

      //count loans for processor
      if (field == PerformanceReport.loans) {
        Server.queueService(QueueType.ADMIN).addTask(UpdateNumberOfLoanOp.class, JSON.empty().set(Loan.processor, loan.get(Loan.processor)));
      }
    }
  }

  private static void updateNumber(Bean entity, Field<Integer> field) {
    if (entity != null) {
      entity.increment(field);
      entity.save();
    }
  }

  public static void setActionFlag(Bean loan, String flag, String value) {
    Field<Boolean> fl = Loan.TYPE.field(flag);
    if (fl != null) {
      loan.set(fl, Boolean.valueOf(value));
    }
  }

  public static void checkWorkflowTask(Bean loan, String... tasks) {
    updateWorkflowTaskStatus(loan, Colls.asList(tasks), true);
  }

  /**
   * Used in js function. DON'T DELETE
   */
  public static void checkWorkflowTask(Bean loan, List<String> tasks) {
    updateWorkflowTaskStatus(loan, tasks, true);
  }

  public static void unCheckWorkflowTask(Bean loan, String... tasks) {
    updateWorkflowTaskStatus(loan, Colls.asList(tasks), false);
  }

  /**
   * Used in js function. DON'T DELETE
   */
  public static void unCheckWorkflowTask(Bean loan, List<String> tasks) {
    updateWorkflowTaskStatus(loan, tasks, false);
    loan.save();
  }

  protected static void updateWorkflowTaskStatus(Bean loan, List<String> tasks, boolean complete) {
    List<Bean> toBeDone = findLoanTasks(loan, tasks);
    for (Bean task : toBeDone) {
      task.set(WorkflowTask.Status, complete ? Cleared : AssignableStatus.Pending);
    }
  }

  public static void deleteWorkflowTasks(Bean loan, String... tasks) {
    deleteWorkflowTaskBeans(loan, findLoanTasks(loan, Colls.asList(tasks)));
  }

  /**
   * Used in js function. DON'T DELETE
   */
  public static void deleteWorkflowTasks(Bean loan, List<String> tasks) {
    deleteWorkflowTaskBeans(loan, findLoanTasks(loan, tasks));
    loan.save();
  }

  private static List<Bean> findLoanTasks(Bean loan, List<String> tasks) {
    List<Bean> allTasks = new ArrayList<>();
    for (String pattern : tasks) {
      QueryBuilder<Bean> query = loan.bundle().find(WorkflowTask.TYPE).whereEquals(WorkflowTask.pattern, pattern);
      if (isEscrowWorkflow(pattern)) {
        query.whereEquals(WorkflowTask.container, loan.key());
      } else {
        query.whereEquals(WorkflowTask.loan, loan.id());
      }
      allTasks.addAll(query.list());
    }
    return allTasks;
  }

  public static void deleteWorkflowTaskBeans(Bean loan, List<Bean> tobeDeleted) {
    for (Bean task : tobeDeleted) {
      if (task.hasValue(WorkflowTask.action)) {
        Field field = Loan.TYPE.field(task.get(WorkflowTask.action));
        if (Loan.closed.equals(field)) {
          loan.set(Loan.allow_reopen_closed, true);
        }
        if (field.dataType() == BooleanType.instance()) {
          loan.resetField(field);
        } else {
          loan.remove(task.get(WorkflowTask.action));
        }
      }
      task.deleteOnCommit();
    }
  }

  public static void removeLock(Bean loan) {
    loan.journal("Unlock");
    if (loan.hasValue(Loan.lock_key)) {
      Bean lock = loan.load(Loan.lock_key);
      lock.removeAll(Loan.lock_key.dot());
      lock.remove(Loan.lock_key);
      loan.resetField(Loan.lock_expiration_tz).resetField(Loan.locked_rate);
      loan.resetField(Loan.locked);
//      loan.save();
    }
  }

  public static void waiveAppraisal(Bean loan) {
    loan.journal("Waive Appraisal");
    loan.set(Loan.ordered_appraisal, false)
            .set(Loan.appraisal_ordered, AppraisalStatus.Waived);
    loan.save();
  }

  public static void removeFields(Bean loan, List<String> fields) {
    loan.journal("Undo tasks");
    for (String f : fields) {
      Field field = Loan.TYPE.field(f);
      if (Loan.closed.equals(field)) {
        loan.set(Loan.allow_reopen_closed, true);
      }
      if (field.equals(Loan.appraisal_ordered)) {
        loan.set(field, AppraisalStatus.No);
      } else if (field.dataType() == BooleanType.instance()) {
        loan.resetField(field);
      } else if (field.name().equals(Loan.final_date_tz.name())) {
        loan.set(Loan.final_date_tz, null);
      } else {
        loan.remove(field);
      }
    }
    loan.save();
  }

  public static Bean createWorkflowTask(Bean loan, HasValues node) {
    return createWorkflowTask(loan, node, loan.bundle());
  }

  public static Bean createWorkflowTask(Bean loan, HasValues node, Bundle bundle) {
    String patternName = node.getRaw("name");
    String taskName = loan.id() + "-" + patternName;
    if (!bundle.exists(WorkflowTask.TYPE, taskName)) {
      Logger logger = Logger.getLogger(LoanOps.class.getName());
      logger.info("Creating task from pattern: " + patternName);
      Map<String, Object> context = new HashMap<>();
      context.put("root", loan);
      try {
        final JSON pattern = bundle.demand(TaskPattern.TYPE, patternName).toMap();
        List<String> labels = pattern.get(TaskPattern.labels);
        List<String> additionalLabels = node.getRaw("labels");
        if (additionalLabels != null) {
          labels.addAll(additionalLabels);
        }
        Engine engine = new Engine().xml();
        engine.transform(pattern, TaskPattern.subject);
        Bean task = bundle.create(WorkflowTask.TYPE, taskName)
                .set(WorkflowTask.description, pattern.get(TaskPattern.description))
                .set(WorkflowTask.task_name, pattern.get(TaskPattern.subject))
                .set(WorkflowTask.action, pattern.get(TaskPattern.action))
                .set(WorkflowTask.pattern, patternName)
                .set(WorkflowTask.is_escrow_workflow, pattern.get(TaskPattern.is_escrow_workflow, false))
                .set(WorkflowTask.priority, pattern.get(TaskPattern.priority))
                .set(WorkflowTask.lender_path, pattern.get(TaskPattern.lender_path))
                .set(WorkflowTask.Status, node.hasValue(WorkflowTask.Status) ? node.get(WorkflowTask.Status) : AssignableStatus.Pending)
                .set(WorkflowTask.labels, labels)
                .set(WorkflowTask.created, new Date());
        if (loan.is(Loan.is_escrow_workflow)) {
          task.set(WorkflowTask.container, loan.key());
        } else {
          task.set(WorkflowTask.loan, loan.id());
        }

        List<String> owners = new ArrayList<>();
        List<String> patternOwners = pattern.get(TaskPattern.owners);
        if (patternOwners.contains(OwnerType.Agent.name())) {
          owners.add(loan.get(Loan.agent));
        }
        if (patternOwners.contains(OwnerType.Processor.name())) {
          final String processorName = loan.get(Loan.processor);
          if (processorName != null) {
            owners.add(processorName);
          }
        }
        if (patternOwners.contains(OwnerType.Escrow.name())) {
          final String escrowCompany = loan.get(Loan.escrow_company);
          List<Bean> escrows = new Bundle().find(Escrow.TYPE).where(Escrow.company_key, CompareType.EQUAL, escrowCompany).list();
          for (Bean escrow : escrows) {
            owners.add(escrow.keyName());
          }
        }
        String broker = Server.getCompany().get(Company.owner_key_name);
        if (broker != null) {
          owners.add(broker);
        }
        if (loan.hasValue(Loan.branch)) {
          String bm = loan.get(Loan.branch.dot(Branch.branch_manager));
          if (bm != null) {
            owners.add(bm);
          }
        }

        task.set(WorkflowTask.owners, owners);
        task.copyFrom(node, WorkflowTask.parent);
        task.set(WorkflowTask.independent, node.get(WorkflowTask.independent) != null)
                .set(WorkflowTask.is_last_status, node.get(WorkflowTask.is_last_status) != null);
        updateTaskStatus(task, loan);
        return task;
      } catch (Exception e) {
        if (Server.isDev()) {
          throw e;
        }
        Bucket.logTheException(e, "Error creating task from pattern: " + patternName + " for loan: " + loan.get(Loan.loan_number) + " id: " + loan.id());
      }
    } else {
      restampReachedStatusTask(bundle.get(WorkflowTask.TYPE, taskName));
    }

    return null;
  }

  /**
   * A status task can be spawned before the flow reaches it (general_v3 creates Clear to close as soon as the appraisal
   * is uploaded on a locked loan, ahead of Approved with conditions). WorkflowTaskOp.calculateStatus ranks cleared status
   * tasks by created, so date an uncleared one from the moment the flow asks for it again, or clearing it never moves the
   * status (ticket 37737127350).
   */
  static void restampReachedStatusTask(Bean task) {
    if (task != null && task.get(WorkflowTask.parent) == null && task.isNot(WorkflowTask.independent)
            && task.isNot(WorkflowTask.cleared)) {
      task.set(WorkflowTask.created, new Date());
    }
  }

  private static void updateTaskStatus(Bean task, Bean loan) {
    if (task.get(WorkflowTask.pattern).equals(WorkflowTaskOp.BORROWER_E_SIGN_TASK_PATTERN)) {
      boolean isSignedAll = !task.bundle().find(SigningSession.TYPE).whereEquals(SigningSession.loan_id, loan.id())
              .whereEquals(SigningSession.done, false).exists();
      if (isSignedAll) {
        task.set(WorkflowTask.Status, AssignableStatus.Cleared);
        if (task.hasValue(WorkflowTask.action)) {
          loan.set(task.get(WorkflowTask.action), true);
        }
      }
    }
  }

  public static void assignAllProcessorLoan(Bean admin) {
    String email = admin.get(Admin.email);
    Bean branch = admin.load(Admin.branch);
    Bean bm = (branch != null && branch.hasValue(Branch.branch_manager))
            ? branch.load(Branch.branch_manager) : null;
    boolean validBM = bm != null && bm.hasValue(Admin.company_nmls) && bm.is(Admin.active);
    String newAdmin = validBM
            ? branch.load(Branch.branch_manager).keyName() : Server.getCompany().get(Company.owner_key_name);
    Bundle bundle = new Bundle();
    bundle.disableEvents(true);
    // change alert owner
    bundle.find(Loan.TYPE).whereEquals(Loan.agent, email).whereEquals(Loan.has_alert, true).update(new Action<Bean>() {
      @Override
      public void execute(Bean item) {
        item.set(Loan.agent, newAdmin);
      }
    });

  }

  public static boolean hasActiveTransaction(String email) {
    return hasActiveTransaction(email, null);
  }

  public static boolean hasActiveTransaction(String email, String excludeKey) {
    return haveActiveLoanTransaction(email, excludeKey) || haveActiveRETransaction(email, excludeKey);
  }

  private static boolean haveActiveLoanTransaction(String email, String excludeKey) {
    QueryBuilder<Bean> query = new Bundle().find(Loan.TYPE)
            .whereEquals(Loan.transaction_type, TransactionType.Loan)
            .whereEquals(Loan.email, email)
            .whereEquals(Loan.final_date_tz, null).keyOnly();
    if (excludeKey == null) {
      return query.exists();
    } else {
      return excludeKey(excludeKey, query);
    }
  }

  private static boolean haveActiveRETransaction(String email, String excludeKey) {
    QueryBuilder<Bean> query = new Bundle().find(Loan.TYPE)
            .whereEquals(Loan.transaction_type, TransactionType.RE)
            .whereEquals(Loan.email, email)
            .whereEquals(Loan.final_date_tz, null).keyOnly();
    if (excludeKey == null) {
      return query.exists();
    } else {
      return excludeKey(excludeKey, query);
    }
  }

  private static boolean excludeKey(String key, QueryBuilder<Bean> query) {
    return Colls.any(query.list(), loan -> !loan.key().equals(key));
  }

  public static boolean hasActiveApplication(String email) {
    return hasActiveApplication(email, null);
  }

  public static boolean hasActiveApplication(String email, String excludeKey) {
    return hasOpenApplication(email, excludeKey) || hasQualifiedApplication(email, excludeKey);
  }

  private static boolean hasQualifiedApplication(String email, String excludeKey) {
    QueryBuilder<Bean> query = new Bundle().find(Loan.TYPE)
            .whereEquals(Loan.email, email)
            .whereEquals(Loan.transaction_type, null)
            .whereEquals(Loan.has_application, true)
            .whereEquals(Loan.status, LoanStatus.Qualified).keyOnly();
    if (excludeKey == null) {
      return query.exists();
    } else {
      return excludeKey(excludeKey, query);
    }
  }

  private static boolean hasOpenApplication(String email, String excludeKey) {
    QueryBuilder<Bean> query = new Bundle().find(Loan.TYPE)
            .whereEquals(Loan.email, email)
            .whereEquals(Loan.transaction_type, null)
            .whereEquals(Loan.has_application, true)
            .whereEquals(Loan.status, LoanStatus.Opened).keyOnly();
    if (excludeKey == null) {
      return query.exists();
    } else {
      return excludeKey(excludeKey, query);
    }
  }

  public static void createEscrowEmailList(Bean loan, List<String> escrowsEmails, List<String> backupEscrowsEmails) {
    final String escrowCompany = loan.get(Loan.escrow_company);
    List<Bean> escrows = new Bundle().find(Escrow.TYPE).where(Escrow.company_key, CompareType.EQUAL, escrowCompany).list();
    for (Bean escrow : escrows) {
      if (escrow.has(Escrow.tasks, EscrowTask.InputFeesAndSetupSigningAppointment.name())) {
        escrowsEmails.add(escrow.get(Escrow.email));
      } else if (escrow.has(Escrow.tasks, EscrowTask.BackupInputFeesAndSetupSigningAppointment.name())) {
        backupEscrowsEmails.add(escrow.get(Escrow.email));
      }
    }
  }

  public static int ensureBorrowerCondition(Bean loan, String code) {
    return ensureCondition(loan, FieldsBase.create().set(Condition.code, code)
            .set(Condition.owner_type, ConditionOwnerType.Borrower).set(Condition.require, false));
  }

  public static int ensureConditionByJsonString(Bean loan, String data) {
    JSON params = JSON.parse(data);
    return ensureCondition(loan, params);
  }

  public static int ensureCondition(Bean loan, HasValues data) {
    if (loan != null && loan.isNot(Loan.dead)) {
      Bundle bundle = loan.bundle();
      Bean bean = bundle.find(Condition.TYPE).whereEquals(Condition.details, data.get(Condition.details))
              .whereEquals(Condition.loan_id, loan.id()).single();
      if (bean == null) {
        ToDosFilter.Config config = ToDosFilter.get(data.get(Condition.code));
        JSON condition = JSON.empty().set(Condition.details, data.hasValue(Condition.details) ? data.get(Condition.details) : config.getDetail())
                .set(Condition.require, config.isRequire())
                .set(Condition.owner_type, data.hasValue(Condition.owner_type) ? data.get(Condition.owner_type) : config.getConditionOwnerType())
                .set(Condition.loan_id, loan.id())
                .set(Condition.cleared, false)
                .set(Condition.admin_only, data.get(Condition.admin_only))
                .set(Condition.event, data.get(Condition.event))
                .set(Condition.code, data.get(Condition.code))
                .set(Condition.generated, true);
        try {
          new SaveTodoOp().execute(condition);
        } catch (Exception e) {
          bundle.logTheException(e, bundle.get(Loan.TYPE, loan.id()));
        }
        return 1;
      }
    }
    return 0;
  }

  public static int ensureCondition(Long loanId, HasValues data) {
    Bundle bundle = new Bundle();
    Bean loan = bundle.demand(Loan.TYPE, loanId);
    return ensureCondition(loan, data);

  }

  /**
   * Update the eligible to lock flag base on the status of workflow. This from js code, please find this by text search
   *
   * @param loan: The loan
   */
  public static void updateEligibleToLock(Bean loan) {
    loan.journal(CoreMessages.coreMessages.edit(), false, true);
    loan.set(Loan.client_ready_to_lock, true).save();
  }

  public static void updateNotEligibleReason(Bean loan, String reasonTaskKeyName) {
    Bundle bundle = new Bundle();
    Bean workflowTask = bundle.get(TaskPattern.TYPE, reasonTaskKeyName);
    loan.journal(CoreMessages.coreMessages.edit(), false, true);
    loan.set(Loan.not_ready_to_lock_reason, "Loan - " + workflowTask.get(TaskPattern.subject)).save();
  }

  public static void ensureConditions(Bean loan, List<JSON> conditions) throws Exception {
    for (JSON condition : conditions) {
      condition.set(Condition.loan_id, loan.id())
              .set(Condition.generated, false);
      new SaveTodoOp().execute(condition);
    }
  }

  public static void ensureEscrowConditions(Long loanId, String... names) {
    ensureEscrowConditions(true, loanId, names);
  }

  public static void ensureEscrowConditions(boolean require, Long loanId, String... names) {
    Bundle bundle = new Bundle();
    Bean loan = bundle.demand(Loan.TYPE, loanId);
    Arrays.stream(names).forEach(name -> ensureCondition(loan,
            FieldsBase.create().set(Condition.details, name)
                    .set(Condition.require, require)
                    .set(Condition.owner_type, ConditionOwnerType.Escrow)));
  }


  public static void countLoans(String eventName, Bean loan) {
    if (eventName.equals(Loan.PROSPECT_CREATED)) {
      Bundle bundle = new Bundle();
      Bean status = bundle.ensure(SystemStatus.TYPE, "application_created");
      Long value = status.get(SystemStatus.value, 0L) + 1;
      status.set(SystemStatus.user, Server.getCompany().get(Company.owner_key_name))
              .set(SystemStatus.title, value + " applications created so far this month")
              .set(SystemStatus.value, value)
              .set(SystemStatus.target, LoanSection.prospects.name());
      bundle.commit();
    }

    boolean isCreated = eventName.equals(Loan.LOAN_CREATED);
    if (isCreated) {
      Bundle bundle = new Bundle();
      Bean status = bundle.ensure(SystemStatus.TYPE, "loan_created");
      Long value = status.get(SystemStatus.value, 0L) + 1;
      status.set(SystemStatus.user, Server.getCompany().get(Company.owner_key_name))
              .set(SystemStatus.title, value + " loans created so far this month")
              .set(SystemStatus.value, value)
              .set(SystemStatus.target, LoanSection.loans.name());
      bundle.commit();
    }

    if (loan.is(Loan.transaction_type, TransactionType.Loan)) {
      boolean isFinal = loan.hasValue(Loan.final_date_tz);
      Bundle bundle = new Bundle();
      if (isCreated || isFinal) {
        int count = bundle.find(Loan.TYPE)
                .whereEquals(Loan.transaction_type, TransactionType.Loan)
                .whereEquals(Loan.final_date_tz, null)
                .count(1000);
        bundle.ensure(SystemStatus.TYPE, "active_loans")
                .set(SystemStatus.user, Server.getCompany().get(Company.owner_key_name))
                .set(SystemStatus.title, count + " active loans")
                .set(SystemStatus.target, LoanSection.loans.name());
      }
      if (loan.is(Loan.locked)) {
        int count = bundle.find(Loan.TYPE)
                .whereEquals(Loan.locked, true)
                .whereEquals(Loan.funded, false)
                .count(1000);
        bundle.ensure(SystemStatus.TYPE, "locked_loans")
                .set(SystemStatus.user, Server.getCompany().get(Company.owner_key_name))
                .set(SystemStatus.title, count + " locked loans")
                .set(SystemStatus.target, LoanSection.loans.name());
      }
      if (loan.hasValue(Loan.final_date_tz)) {
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.DAY_OF_MONTH, 1);
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        QueryBuilder<Bean> finalLoans = bundle.find(Loan.TYPE)
//                .project(Loan.current_task_pattern)
                .where(Loan.final_date_tz, CompareType.GREATER_THAN_OR_EQUAL, Dates.dates.getISOStringFromDate(calendar.getTime()));
        MapCounter<String> counter = new MapCounter<>();
        for (Bean bean : finalLoans) {
          counter.increment(bean.get(Loan.milestone_progress), 1);
        }
        Map<String, String> mapper = new HashMap<>();
        mapper.put("loan_closed", "closed");
        mapper.put("loan_funded", "funded");
        for (Map.Entry<String, Integer> entry : counter.entrySet()) {
          String status = entry.getKey();
          String value = mapper.get(status);
          String milestone = value != null ? value : status;
          if (milestone != null) {
            bundle.ensure(SystemStatus.TYPE, status + "_loans")
                    .set(SystemStatus.user, Server.getCompany().get(Company.owner_key_name))
                    .set(SystemStatus.title, entry.getValue() + " " + Strings.toTitle(status) + " so far this month")
                    .set(SystemStatus.target, LoanSection.loans.name() + "/" + LoansView.getHighestTabForCurrentUser()
                            + "?" + Loan.milestones.name() + "=" + milestone);
          }
        }
      }
      bundle.commit();
    }
  }

  public static void setLoanJournal(JSON input, Bean loan) {
    if (input.hasValue(FnmImport.file_name)) {
      loan.journal((input.is(FnmImport.import_multiple) ? "Multiple" : "Single") + " Import");
    } else if (input.hasValue(Loan.original_loan)) {
      loan.journal("Clone");
    } else {
      loan.journal("New");
    }
  }

  public static void addImportErrorRecord(JSON input, Bean loan) {
    if (input.hasValue(FnmImport.error_records)) {
      final Bean history = new Bundle().createWithKey(History.TYPE);
      history.set(History.container, loan.key())
              .set(History.action, "Import")
              .set(History.changes, input.get(FnmImport.error_records))
              .set(History.updated_user, Server.currentUserKey());
      history.save();
    }
  }


  public static void onReferralAgentResponse(String loanKey, String action) {
    Bundle bundle = new Bundle();
    Bean loan = bundle.demand(loanKey);
    Bean agent = new Bundle().demand(loan.get(Loan.referral_borrower_select));

    if (action.equals("accept")) {
      if (loan.hasValue(Loan.referral_borrower_select)) {
        Field[] fields = new Field[]{Contact.first_name, Contact.last_name,
                Contact.email, Contact.phone, Contact.organization};
        Bean realtor = bundle.create(Realtor.TYPE);
        realtor.copyFrom(agent, fields);
        realtor.save();
        loan.journal(ReferralAgentMessages.referralAgentMessages.agent_accept_request(agent.get(PartnerAgent.full_name)));
        loan.set(Loan.buyer_agent, realtor.id());
        loan.save();
      }
    } else if (action.equals("reject")) {
      loan.journal(ReferralAgentMessages.referralAgentMessages.agent_reject_request(agent.get(PartnerAgent.full_name)));
      loan.add(Loan.rejected_referrals, loan.get(Loan.referral_borrower_select));
      loan.set(Loan.referral_borrower_select, null);
      loan.save();
    }
  }

  public static void removeAgent(Bean loan, FK<Long> agentField) {
    if (loan.hasValue(agentField)) {
      final Bean agent = loan.load(agentField);
      if (agent != null) {
        agent.delete();
      }
      loan.remove(agentField);
    }
  }

  public static List<Bean> getAllCondition(Bean loan) {
    return new Bundle().find(Condition.TYPE).whereEquals(Condition.loan_id, loan.id()).list();
  }

  public static HasValues getRateRelatedToLoan(HasValues loan) {
    Double interestRate = loan.get(Rate.interest_rate);
    Long lenderId = loan.get(Loan.lender_id);
    List<Bean> rates = new Bundle().find(Rate.TYPE).whereEquals(Rate.interest_rate, interestRate)
            .whereEquals(Rate.quote_lender, LenderType.fromId(lenderId))
            .list();
    if (Colls.isNotEmpty(rates)) {
      return rates.get(0);
    } else {
      return null;
    }
  }

  public static void checkEPOLoan(Bean loan, boolean changeEPODate) {
    if (!loan.hasValue(Loan.street) || !loan.hasValue(Loan.zip)) {
      return;
    }
    if (loan.is(Loan.loan_position_type, LoanPositionType.second_position)) {
      return;
    }
    Bundle bundle = new Bundle();

    Long lenderIdForEPOPolicy = loan.get(Loan.lender_id);
    if (lenderIdForEPOPolicy != null && isExemptedFromEPO(loan, bundle.get(LenderAgreement.TYPE, lenderIdForEPOPolicy))) {
      if (changeEPODate && loan.hasValue(Loan.epo_warning)) {
        loan.set(Loan.epo_warning, "");
      }
      return;
    }

    String street = loan.demand(Loan.street);
    Long zip = loan.demand(Loan.zip);
    // Find First Funded Loan which has the same Street and Zip code.
    DSQueryBuilder query = bundle.find(Loan.TYPE);
    if (loan.hasValue(Loan.address_api_street)) {
      query.whereEquals(Loan.address_api_street, loan.get(Loan.address_api_street));
    } else {
      query.whereEquals(Loan.street, street);
    }
    // A funded loan matches its own address, so it would otherwise be detected as its own prior loan
    // and get an EPO date off its own closing date. Skip itself and take the next most recent match:
    // over-fetch because the loan itself can outrank a genuine prior loan in this ordering.
    List<Bean> loans = query.whereEquals(funded, true)
            .whereEquals(Loan.zip, zip)
            .orderBy(final_date_tz, SharedConstants.DESCENDING).limit(2).list()
            .stream().filter(other -> !Objects.equals(other.id(), loan.id()))
            .limit(1).collect(Collectors.toList());

    if (loans.isEmpty()) {
      if (changeEPODate && loan.hasValue(Loan.epo_warning)) {
        loan.set(Loan.epo_warning, "");
      }
    } else {
      Bean loanHasSamePropAddress = loans.get(0);
      final Date today = Dates.dates.removeTime(new Date());
      Date latestDateForEPO = Dates.dates.removeTime(Dates.dates.getDateFromISOString(loanHasSamePropAddress.get(Loan.final_date_tz)));
      if (loanHasSamePropAddress.is(Loan.channel, LoanChannel.correspondent_lender) && loanHasSamePropAddress.hasValue(Loan.purchase_date_tz)) {
        latestDateForEPO = Dates.dates.removeTime(Dates.dates.getDateFromISOString(loanHasSamePropAddress.get(Loan.purchase_date_tz)));
      }
      int addedEPODay = 181;
      Long lenderId = loan.get(Loan.lender_id);
      if (lenderId != null) {
        Bean lenderAgreement = bundle.get(LenderAgreement.TYPE, lenderId);

        if (lenderAgreement != null) {
          if (lenderAgreement.hasValue(LenderAgreement.epo_period_days)) {
            addedEPODay = 1 + lenderAgreement.get(LenderAgreement.epo_period_days);
          } else {
            addedEPODay = 1 + lenderAgreement.get(LenderAgreement.lender_epo_period, addedEPODay);
          }
        }
      }
      final Date epoDate = Dates.dates.addDays(latestDateForEPO, addedEPODay);

      if (changeEPODate) {
        loan.set(Loan.epo_date, epoDate);
        logger.info(String.format("Set epo %s for loan %d.", epoDate, loan.id()));
      }

      if (today.after(Dates.dates.addDays(latestDateForEPO, -1)) && today.before(Dates.dates.addDays(epoDate, 1))) { // [epo - 181 , epo]
        //TODO : please avoid to embed HTML & CSS in data like this. It's better to extract out data and have corresponding presenter in client side.
        if (changeEPODate) {
          loan.set(Loan.epo_warning, String.format("Please make sure the new loan will be funded ON or AFTER the EPO date.<br/><br/>" +
                          "<style>table > tbody > tr > td:nth-child(2n) {padding-left: 20px;}.modal-body {background-color: rgb(250, 240, 170);}</style>" +
                          "<table style='margin-left: 25px;'>" +
                          "<tr><td>Previous loan %s closing date</td><td>%s</td></tr>" +
                          "<tr><td>EPO date (System generated)</td><td>%s</td></tr>" +
                          "</table>" +
                          "<br/><i><u><b>Disclaimer</b></u>: EPO date is a system estimate and may be inaccurate. <b>Please verify the final EPO date directly with the Lender</b> before proceeding.</i>",
                  String.format("<a href='%s/%s?key=%s'>%s</a>", Server.baseUrl(), LoanSection.loans.name(), loanHasSamePropAddress.key(), loanHasSamePropAddress.get(Loan.loan_number)),
                  Format.format.formatDate(latestDateForEPO, "MM/dd/yyyy"),
                  Format.format.formatDate(epoDate, "MM/dd/yyyy")));
          logger.info(String.format("Set epo warning for loan %d.", loan.id()));
          sendEmailEPO(loan, loanHasSamePropAddress);
        } else if (today.before(Dates.dates.addDays(epoDate, -45)) && loan.hasValue(Loan.has_alert)) { // [epo - 181, epo - 45)
          LoanOps.disableAlert(loan, false);
          loan.set(Loan.disable_alert_reason, DisableAlertReason.EPO);
          logger.info(String.format("EPO disabling alert linked to loan %d.", loan.id()));
        }
      }
    }
  }

  public static void unLockLoanEvent(Bean loan) {
    loan.set(Loan.locked, false);
    loan.save();
  }

  public static void checkNSAndAddEventMilestoneNotificationInsellerateId(CanBeStored loan, String taskCode) {
    if (Strings.isNotEmpty(taskCode)) {
      App.onlyForNS(Company.EASY_LOW_RATE, () -> {
        String milestone = "";
        if (taskCode.contains("_pending_lender_s_approval")) {
          milestone = "Pending Lender's Approval";
        } else if (taskCode.contains("_approved_with_conditions")) {
          milestone = "Approved with Conditions";
        }
        addEventMilestoneNotificationInsellerateId(loan, milestone);
      });
    }
  }

  public static void addEventMilestoneNotificationInsellerateId(CanBeStored loan, String milestone) {
    if (Strings.isNotEmpty(milestone) && loan.hasValue(Loan.in_sell_rate_id)) {
      loan.addEvent("Milestone Motification Insellerate Id", JSON.create("milestone", milestone).toJSONString());
    }
  }

  public static void closeStandaloneHotLead(CanBeStored transaction) {
    Server.queueService(QueueType.LOAN).addTask(CloseStandAloneWatLeadWithTheSameEmailOp.class,
            JSON.empty().set(Loan.id, transaction.id())
                    .set(Loan.transaction_type, transaction.get(Loan.transaction_type))
                    .set(Loan.email, transaction.get(Loan.email)));
  }

  public static void updateStateForTransaction(Bean loan, Bundle bundle) {
    Bean zipCode = bundle.get(ZipCode.TYPE, loan.get(Loan.zip));
    if (zipCode != null) {
      loan.set(Loan.state, zipCode.get(ZipCode.state));
    }
  }

  public static void loanStatusFilterCondition(QueryBuilder<Bean> query, LoanMilestones filter) {
    loanStatusFilterCondition(query, filter, null);
  }

  public static void loanStatusFilterCondition(QueryBuilder<Bean> query, LoanMilestones filter, String milestonesProgress) {
    final String APPLICATION_INCOMPLETE = "APPLICATION INCOMPLETE";
    final String PREPARING_FOR_SUBMISSION = "PREPARING FOR SUBMISSION";

    if (Strings.isNotEmpty(milestonesProgress)) {
      String milestonesProgressUp = milestonesProgress.toUpperCase();
      // Pylon loans never leave current_task_pattern "start" (PylonWorkflowStageApplier
      // drives milestone_progress instead), so pin milestone_progress to its pre-Pylon
      // values or every Pylon loan, closed ones included, matches these two filters.
      List<String> notYetSubmitted = Colls.asList("start", LoanMilestones.preparing_for_submission.name());
      switch (milestonesProgressUp) {
        case APPLICATION_INCOMPLETE:
          query.whereEquals(current_task_pattern, "start");
          query.whereEquals(Loan.is_completed_application, false);
          query.whereIn(milestone_progress, notYetSubmitted);
          break;
        case PREPARING_FOR_SUBMISSION:
          query.whereEquals(current_task_pattern, "start");
          query.whereEquals(Loan.complete_percentage, 1D);
          query.whereIn(milestone_progress, notYetSubmitted);
          break;
        default:
          query.whereEquals(milestone_progress, milestonesProgress);
      }

    } else {
      for (String is : filter.getIs()) {
        query.whereEquals(Loan.TYPE.field(is), true);
      }
      for (String isNot : filter.getIsNot()) {
        query.whereEquals(Loan.TYPE.field(isNot), false);
      }
    }
    if (submitting_to_lender.equals(filter)) {
      query.whereEquals(complete_percentage, 1D);
    }

    if (Arrays.asList(pending_lender_s_approval, prior_to_underwriting).contains(filter)) {
      query.whereEquals(Loan.filter_milestones, filter.toString());
    } else if (Arrays.asList(set_up, submitting_to_lender).contains(filter)) {
      query.whereEquals(Loan.filter_prepare_for_submission, filter.toString());
    }

  }

  public static QueryBuilder<Bean> prospectStatusFilterCondition(LoanStatus statusFilter, QueryBuilder<Bean> query) {
    if (statusFilter.equals(LoanStatus.Active)) {
      query.whereEquals(Loan.filter_milestones, LoanStatus.Active.toString());
    } else if (statusFilter.equals(LoanStatus.Inactive)) {
      query.whereEquals(Loan.filter_milestones, LoanStatus.Inactive.toString());
    } else {
      query.whereEquals(Loan.status, statusFilter);
    }
    return query;
  }

  public static QueryBuilder<Bean> leadStatusFilterCondition(LoanStatus statusFilter, QueryBuilder<Bean> query) {
    if (statusFilter != null) {
      if (statusFilter.equals(LoanStatus.Active)) {
        query.whereEquals(Loan.filter_milestones, LoanStatus.Active.toString());
      } else if (statusFilter.equals(LoanStatus.Inactive)) {
        query.whereEquals(Loan.filter_milestones, LoanStatus.Inactive.toString());
      } else {
        query.whereEquals(Loan.status, statusFilter);
      }
    }
    return query;
  }

  /**
   * Keep to Date/Month/Year from original date, set timezone to PDT and reset time.
   * params: 2020-09-12T10:00 GMT+7
   * return: 2020-09-12T00:00 PDT <=> 2020-09-12T14:00 GMT+7
   */
  public static Date resetTimeToPDT(Date date) {
    // keep the DATE but change time zone to America/Los_Angeles
    Calendar clientCalendar = Calendar.getInstance(ThreadContext.clientTimeZone());
    clientCalendar.setTime(date);
    Calendar pdtCalendar = Calendar.getInstance(TimeZone.getTimeZone("America/Los_Angeles"));
    pdtCalendar.set(Calendar.DATE, clientCalendar.get(Calendar.DATE));

    pdtCalendar.set(Calendar.MONTH, clientCalendar.get(Calendar.MONTH));

    pdtCalendar.set(Calendar.YEAR, clientCalendar.get(Calendar.YEAR));
    ServerDateUtils.resetTime(pdtCalendar);
    return pdtCalendar.getTime();
  }

  public static DSQueryBuilder getWorkflowTaskQuery(Bundle bundle, HasValues loan) {
    DSQueryBuilder beans = bundle.find(WorkflowTask.TYPE);
    if (loan.is(Loan.is_escrow_workflow)) {
      beans.whereEquals(WorkflowTask.container, loan.key());
    } else {
      beans.whereEquals(WorkflowTask.loan, loan.id());
    }
    return beans;

  }

  public static String getShortenUrlWithFirebase(String invitationUrl) throws Exception {
    HasValues result = new ShortenUrlWithFirebaseOp().execute(JSON.make(new Field<>("current_link", StringType.instance()), invitationUrl));
    String shortLink = result.get("short_link", StringType.instance());
    return Strings.isNotEmpty(shortLink) ? shortLink : null;
  }

  public static String getInviteMobileAppUrl(CanBeStored<?> loan) {
    return getInviteMobileAppUrl(loan.get(Loan.agent));
  }

  public static String getInviteMobileAppUrl(String agent) {
    String targetLink = Server.baseUrl() + "/company_qr_invitation_download_app";

    if (Strings.isNotEmpty(agent)) {
      Bean admin = new Bundle().get(Admin.TYPE, agent);
      if (admin != null && admin.hasValue(Admin.company_email) && admin.isNot(Admin.is_broker)) {
        targetLink = admin.get(Admin.company_domain_url) + "/qr_invitation?inviter=" + admin.get(Admin.company_email);
      }
    }

    try {
      return getShortenUrlWithFirebase(targetLink);
    } catch (Exception e) {
      return targetLink;
    }
  }

  public static void sendMobileAppInvitationSMS(CanBeStored<?> loan) {
    if (!LOAN_FACTORY.equals(NS.get()) || !loan.hasValue(Loan.agent) || loan.is(Loan.app_downloaded)) {
      return;
    }

    boolean trigger = false;
    if (LoanUtils.isLead(loan)) {
      if (loan.isChanged(Loan.status) && loan.is(Loan.status, LoanStatus.Interested)) {
        trigger = true;
      }
    } else if (LoanUtils.isProspect(loan)) {
      if (loan.isNew()) {
        trigger = true;
      }

      if (loan.isChanged(Loan.status) && loan.is(Loan.status, LoanStatus.In_Progress)) {
        trigger = true;
      }

      if (loan.isChanged(complete_percentage) && loan.get(complete_percentage, 0D) >= 0.99) {
        trigger = true;
      }
    }

    if (!trigger) {
      return;
    }

    if (!loan.load(Loan.agent).is(Admin.invite_to_use_mobile_app)) {
      return;
    }

    CanBeStored<?> sender = null;
    if (loan.is(Loan.agent, Server.getCompany().get(Company.owner_key_name))) {
      if (loan.hasValue(Loan.additional_lo) && loan.load(Loan.additional_lo).is(Admin.zoom_phone_connected)) {
        sender = loan.load(Loan.additional_lo);
      } else if (loan.hasValue(Loan.setup_specialist) && loan.load(Loan.setup_specialist).is(Admin.zoom_phone_connected)) {
        sender = loan.load(Loan.setup_specialist);
      }
    } else if (loan.load(Loan.agent).is(Admin.zoom_phone_connected)) {
      sender = loan.load(Loan.agent);
    }

    // Send from Main LO's Zoom Phone. If not set up, do not send.
    if (sender == null) {
      return;
    }

    String url = getInviteMobileAppUrl(loan);
    String borrowerName = loan.get(Loan.first_name);
    String message = loanMessages.sms_invite_app_template(borrowerName, url);

    JSON input = JSON.empty()
            .set(Admin.key, sender.get(Admin.key))
            .set(HasParticipants.participants, Collections.singletonList(loan.get(Loan.phone)))
            .set(ZoomSMSMessage.message, message);
    Server.queueService(QueueType.ZOOM).addTask(SendZoomSMSOp.class, input);
  }

  /**
   * Loan-state half of the app invite rule, shared by the save watcher and the queued op. The
   * watcher fires on every Loan save (a note, a data fix, an archive), so this is what keeps a
   * closed file quiet: a Loan is done by its funded/dead/closed flags, a Prospect by its status.
   */
  public static boolean canSendMobileAppInvitationEmail(HasValues loan) {
    if (loan.is(Loan.app_downloaded) || loan.is(Loan.app_invite_email_sent)) {
      return false;
    }
    if (!LoanUtils.isTransaction(loan) || LoanStatus.isFinalOrClosedTransaction(loan)) {
      return false;
    }
    return loan.hasValue(Loan.email) && loan.hasValue(Loan.first_name)
            && !loan.is(Loan.full_name, Borrower.DEFAULT_BORROWER_NAME);
  }

  public static void sendMobileAppInvitationEmail(CanBeStored<?> loan) {
    if (!LOAN_FACTORY.equals(NS.get()) || !canSendMobileAppInvitationEmail(loan)) {
      return;
    }

    String lockKey = "LOCK_app_invite_email_" + loan.key();
    boolean acquireLock = MemcacheServiceFactory.getMemcacheService().put(lockKey, true,
            Expiration.byDeltaSeconds(300),
            MemcacheService.SetPolicy.ADD_ONLY_IF_NOT_PRESENT);
    if (!acquireLock) {
      return;
    }

    Server.queueService(QueueType.EMAIL).addTask(SendMobileAppInvitationEmailOp.class,
            JSON.empty().set(Loan.key, loan.key()));
  }

  public static boolean isEscrowWorkflow(String pattern) {
    return pattern != null && pattern.contains(EscrowWorkflow.ESCROW_WORKFLOW);
  }

  public static String getFullAddress(HasValues loan) {
    return loan.get(Loan.full_address_api, loan.get(Loan.full_address, ""));
  }

  public static String messageForEmailDripCampaign(HasValues root) {
    HasValues company = Server.getCompany();
    String message = "";
    if (company.hasValue(Company.close)) {
      message = String.format("This is an automated message. Our business hours is %d am to %d pm %s, Monday to Friday", company.get(Company.open), company.get(Company.close, 0) - 12, company.get(Company.default_time_zone));
      if (root.hasValue(Loan.agent)) {
        HasValues lo = root.load(Loan.agent);
        message += String.format("</br>For inquiries relating to your loan, please contact your Loan officer: %s - %s", lo.get(Admin.full_name), lo.get(Admin.company_phone));
      }
    }

    return message;
  }

  public static String getBrandImage(String brand) {
    BiFunction<String, String, String> getImgCard = (img, href) -> "<a href=\"" + href + "\" target=\"_blank\" ><img src=\"" + img + "\" alt=\"" + brand + "\"></a>";
    if ("Connect Your Perks".equals(brand)) {
      return getImgCard.apply("https://storage.googleapis.com/lender-rate/CDN/loanfactory/img/ConnectYourPerksLogo.svg", "https://connectyourperks.com/");
    } else if ("Best Senior Discount".equals(brand)) {
      return getImgCard.apply("https://storage.googleapis.com/lender-rate/CDN/loanfactory/img/BestSeniorDiscountLogo.svg", "https://bestseniordiscounts.com/");
    } else if ("Employee And Member Discounts".equals(brand)) {
      return getImgCard.apply("https://storage.googleapis.com/lender-rate/CDN/loanfactory/img/EmployeeAndMemberDiscountsLogo.svg", "https://employeeandmemberdiscounts.com/");
    }
    return getImgCard.apply("https://storage.googleapis.com/lender-rate/CDN/loanfactory/img/loan_factory_logo.png", "https://www.loanfactory.com/");
  }

  public static List<HasValues> getLoanOfficersByOriginState() {
    String state = Server.originState();
    if (Strings.isEmpty(state)) {
      state = "CA";
    }
    try {
      return new FindLoanOfficerOp()
              .execute(JSON.make(TableParams.LENGTH, 40)
                      .set(Admin.agent_licensed_states, Colls.asList(state))
                      .set(Admin.hide_from_public_website, false)
                      .set(Admin.sort_by_go_live, true)
                      .set(Admin.labels, Colls.asList("is " + Admin.live_external.label()))
              ).get(QueryResult.rows)
              .stream()
              .filter(officer -> officer.is(Admin.can_go_live))
              .toList();
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  public static List<HasValues> getRecruiters() {
    try {
      return new FindRecruiterLiveOp()
              .execute(JSON.make(TableParams.LENGTH, 40)
                      .set(Admin.labels, Colls.asList("is " + Admin.live_external.label())))
              .get(QueryResult.rows)
              .stream()
              .filter(recruiter -> recruiter.hasValue(Admin.live_room_url) && (recruiter.is(Admin.is_recruiter) || recruiter.is(Admin.is_out_sourcing_recruiter)))
              .toList();
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }

  public static boolean displayLiveLoOnCompanyHomePage() {
    Bean config = new Bundle().get(LoanConfiguration.TYPE, 1L);
    return config != null && config.is(LoanConfiguration.display_live_lo_on_company_home_page);
  }

  public static String officerUrl(HasValues officer) {
    return "/en/find-loan-officers/detail/"
            + Strings.toId(officer.get(Contact.full_name))
            + "-" + officer.get(Admin.mortgage_nmls);
  }

  public static String getOfficerRating(HasValues officer) {
    return "<div class=\"row m-0 mt-1\" style=\"height:2em\">" +
            "<div class=\"col-12 text-center p-0\">" + officerReview(officer) + "</div></div>";
  }

  private static String officerReview(HasValues officer) {
    Integer reviewCount = officer.get(Admin.total_all_source_review, 0);
    if (reviewCount == 0) {
      return "";
    }
    Double avgRating = officer.get(Admin.avg_rate_all_source_review, 5D);
    avgRating = Math.round(avgRating * 10.0) / 10.0;

    String reviewUrl = officer.is(Admin.is_broker) ? "/testimonials"
            : ("javascript:gotoPlace('agent_reviews_popup?"
            + new HttpParams().copyFrom(officer, Admin.key, Admin.keyName, Admin.full_name).set("popup", "1").toQueryString()
            + "')");

    return "<a href=\"" + reviewUrl + "\">" +
            "<div class=\"review-text\">" +
            "<span class=\"font-weight-bold\" >" + avgRating + " " +
            getFontAwesomeStarHtml(5, avgRating, (shape, icon)
                    -> "<i class=\"" + shape + " " + icon + " star-color\"></i>") +
            "</span> (" + reviewCount + ")"
            + " </div></a>";
  }

  public static String getFontAwesomeStarHtml(int max, double score, BiFunction<String, String, String> generator) {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < max; ++i) {
      sb.append(generator.apply(score <= i ? "far" : "fas",
              score > i && score - 0.5 <= i ? "fa-star-half-alt" : "fa-star"));
    }
    return sb.toString();
  }

  public static boolean checkUserCanGoLive(HasValues root) {
    return root.is(Admin.live_external);
  }

  public static boolean isApplicableStates(HasValues campaign) {
    return campaign.is(Campaign.state_scope, Campaign.StateScope.applicable_states);
  }

  public static boolean isAllStatesExceptAFewStates(HasValues campaign) {
    return campaign.is(Campaign.state_scope, Campaign.StateScope.all_states_except_a_few_states);
  }

  public static String autoGenerateEscrowNumber(HasValues loan) {
    Bean config = new Bundle().get(InHouseClosingCompany.TYPE, 1l);

    if (config == null || config.isNot(InHouseClosingCompany.using_escrow_number_format) || loan.isNot(Loan.escrow_company, config.get(InHouseClosingCompany.escrow_company))) {
      return null;
    }

    String escrowNumber = config.get(InHouseClosingCompany.pre_part) + config.get(InHouseClosingCompany.mid_part) + config.get(InHouseClosingCompany.start_number);

    if (config.is(InHouseClosingCompany.type_generate_end_part, InHouseClosingCompany.INCREMENT)) {
      int startNumber = Integer.parseInt(config.get(InHouseClosingCompany.start_number));
      String increaseStartNumber = String.format("%0" + config.get(InHouseClosingCompany.start_number).length() + "d", startNumber + 1);
      config.set(InHouseClosingCompany.start_number, increaseStartNumber);
    } else {
      Random random = new Random();
      String maxNumber = "";
      for (int i = 0; i < config.get(InHouseClosingCompany.random_number_length); i++) {
        maxNumber += "9";
      }

      escrowNumber += String.format("%0" + config.get(InHouseClosingCompany.random_number_length) + "d", random.nextInt(Integer.parseInt(maxNumber)));
    }

    config.save();

    return escrowNumber;
  }

  public static boolean isActiveSigningSectionConfig(HasValues loan) {
    Bean signingSessionConfig = new Bundle().find(SigningSessionConfig.TYPE).whereEquals(SigningSessionConfig.state, loan.get(Loan.state)).first();
    if (signingSessionConfig != null) {
      return signingSessionConfig.get(SigningSessionConfig.active_disclosures_config);
    }
    return false;
  }

  public static void needRemoveBorrowerEmailInOptOutList(String email, Bundle bundle) {
    if (Strings.isNotEmpty(email)) {
      Bean optOutList = bundle.get(OptOutRequest.TYPE, email);
      if (optOutList != null) {
        optOutList.delete();
      }
    }
  }

  public static void updatePtoUsed(CanBeStored<?> bean, boolean isPlus) {
    new Bundle().demand(Admin.TYPE, bean.get(Leave.employee))
            .set(Admin.pto_used, bean.get(Leave.employee.dot(Admin.pto_used), 0D) + bean.get(Leave.total_leave_hours) * (isPlus ? 1 : -1))
            .save();
  }

  public static List<HasValues> setOrdersRecordsMCR(List<Bean> records, ReportType reportType) {
    if (Colls.isNotEmpty(records) &&
            records.get(0).get(ReportRecord.name, "").equalsIgnoreCase(MCRCode.Mcr_total_funded.name())) {
      return new ArrayList<>(records);
    }

    List<HasValues> rmlaSectionI = new ArrayList<>();
    List<HasValues> rmlaSectionII = new ArrayList<>();
    List<HasValues> brokerCompensationRecords = new ArrayList<>();
    List<HasValues> correspondentCompensationRecords = new ArrayList<>();

    List<String> brokerCompensationCodes = MCRCode.BROKER_COMPENSATION.stream().map(Enum::name).toList();
    List<String> correspondentCompensationCodes = MCRCode.CORRESPONDENT_COMPENSATION.stream().map(Enum::name).toList();
    List<String> rmlaSectionICodes = MCRCode.RMLA_SECTION_I.stream().map(Enum::name).toList();

    boolean isMCRReport = ReportType.MortgageCallReport.equals(reportType);

    if (isMCRReport) {
      rmlaSectionI.add(FieldsBase.create().set(ReportRecord.label, "RMLA SECTION I").set(ReportRecord.is_section_label, true));
      rmlaSectionII.add(FieldsBase.create().set(ReportRecord.label, "RMLA SECTION II").set(ReportRecord.is_section_label, true));
    }

    int ac063Index = 0;
    Double ac065Amount = 0D;

    for (Bean record : records) {
      String mcrCode = record.get(ReportRecord.name).toUpperCase();
      if (brokerCompensationCodes.contains(mcrCode)) {
        brokerCompensationRecords.add(record);
      } else if (correspondentCompensationCodes.contains(mcrCode)) {
        correspondentCompensationRecords.add(record);
      } else if (rmlaSectionICodes.contains(mcrCode)) {
        if (MCRCode.AC063.name().equals(mcrCode)) {
          ac063Index = rmlaSectionI.size();
        }
        rmlaSectionI.add(record);
      } else {
        rmlaSectionII.add(record);
      }
    }

    if (isMCRReport) {
      Collections.swap(rmlaSectionI, ac063Index, ac063Index + 1);
      if (Colls.isNotEmpty(brokerCompensationRecords)) {
        rmlaSectionI.add(FieldsBase.create().set(ReportRecord.label, "Closed loans - Broker  *******************************").set(ReportRecord.is_section_label, true));
        rmlaSectionI.addAll(brokerCompensationRecords);
      }
      if (Colls.isNotEmpty(correspondentCompensationRecords)) {
        rmlaSectionI.add(FieldsBase.create().set(ReportRecord.label, "Closed loans - Lender  *******************************").set(ReportRecord.is_section_label, true));
        rmlaSectionI.addAll(correspondentCompensationRecords);
      }
      rmlaSectionI.addAll(rmlaSectionII);
    }

    return rmlaSectionI;
  }

  public static void updateTransactionCheckList(Bean loan, String userKey) {
    HasValues checklistDates = loan.get(Loan.checklist_checked_date, FieldsBase.create());
    checklistDates.set(userKey, new Date());
    loan.set(Loan.checklist_checked_date, checklistDates);
  }

  public static String checkExistTicket(Long loanId, Bundle bundle, String transaction) {
    String errorMsg = "";
    if (loanId != null) {
      Bean quoteTicket = bundle.find(RequestQuoteTicket.TYPE)
              .whereEquals(RequestQuoteTicket.transaction, loanId)
              .whereIn(RequestQuoteTicket.status, RequestQuoteStatus.New, RequestQuoteStatus.InProgress)
              .first();
      if (quoteTicket != null) {
        errorMsg = "Quote Ticket Number: " + quoteTicket.get(RequestQuoteTicket.ticker_number);
      }
      if (loanMessages.loan().equals(transaction) || loanMessages.prospect().equals(transaction)) {
        Bean escalationTicket = bundle.find(EscalationTicket.TYPE)
                .whereEquals(EscalationTicket.parent_id, loanId)
                .whereIn(EscalationTicket.status, EscalationTicketStatus.New, EscalationTicketStatus.In_progress)
                .first();
        if (escalationTicket != null) {
          errorMsg = errorMsg.concat(("".equals(errorMsg) ? "" : ", ").concat("Escalation Ticket Number: " + escalationTicket.id()));
        }
        if (loanMessages.loan().equals(transaction)) {
          Bean lockTicket = bundle.find(Ticket.TYPE)
                  .whereEquals(Ticket.parent_id, loanId)
                  .whereIn(Ticket.status, TicketStatus.New, TicketStatus.In_Progress)
                  .first();
          if (lockTicket != null) {
            errorMsg = errorMsg.concat(("".equals(errorMsg) ? "" : ", ").concat("Lock Ticket Number: " + lockTicket.id()));
          }
        }
      }
    }
    return "".equals(errorMsg) ? errorMsg :
            loanMessages.exist_active_ticket_when_close_transaction(transaction.toLowerCase(), errorMsg);
  }

  public static void sendNotificationToOwnerWhenTransactionCreated(HasValues loan, String chanelConfig) {
    Set<String> owners = new HashSet<>();
    Map<String, String> ownerKeys = new HashMap<>();
    List<FK<String>> fields = Colls.asList(Loan.agent, Loan.originator_assistant, Loan.processor);

    String type = "Experian lead";
    String section = LoanSection.experian_leads.name();
    if (chanelConfig.equals(ChannelsFilter.NEW_CREATED_PROSPECTS)) {
      type = "application";
      section = LoanSection.prospects.name();
    } else if (chanelConfig.equals(ChannelsFilter.NEW_CREATED_LEADS)) {
      type = "lead";
      section = LoanSection.leads.name();
    }

    Bundle bundle = new Bundle();
    fields.forEach(field -> {
      if (loan.hasValue(field)) {
        String adminKeyName = loan.get(field);
        if (Strings.isNotEmpty(adminKeyName)) {
          String adminKey = bundle.createKeyCode(Admin.TYPE, adminKeyName);
          owners.add(adminKey);
          ownerKeys.put(adminKey, adminKeyName);
        }
      }
    });

    if (Colls.isNotEmpty(owners)) {
      for (String owner : owners) {
        new NotificationFactory()
                .owners(Colls.asList(owner))
                .title(LoanMessages.loanMessages.created_transaction_notification_message(type, loan.get(Loan.full_name), getRolesLabel(loan, ownerKeys.get(owner))))
                .channel(chanelConfig)
                .target(section + "?labels=" + loan.id())
                .action("View " + type)
                .push();
      }
    }

  }

  public static String getRolesLabel(HasValues loan, String keyName) {
    return Stream.of(Loan.agent, Loan.processor, Loan.originator_assistant)
            .filter(field -> loan.is(field, keyName))
            .map(Field::label)
            .collect(Collectors.joining(", "));
  }

  public static void updateTransactionTeams(HasValues bean) {
    List<FK<String>> ownerFields = Colls.asList(Loan.agent, Loan.realtor_specialist,
            Loan.originator_assistant, Loan.setup_specialist, Loan.underwriter);
    if (LoanUtils.isLoan(bean)) {
      ownerFields.add(Loan.disclosure_specialist);
      ownerFields.add(Loan.processor);
      if (Modules.modules.isEnableModule(AssemblyLineMod.NAME)) {
        ownerFields.addAll(Colls.asList(Loan.submission_processor, Loan.condition_processor, Loan.closing_processor));
      }
    }

    bean.remove(Loan.teams);
    ownerFields.forEach(field -> {
      if (bean.hasValue(field)) {
        HasValues admin = bean.load(field);
        if (admin != null && admin.is(Admin.active) && admin.hasValue(Admin.team)) {
          bean.add(Loan.teams, true, admin.get(Admin.team));
        }
      }
    });

  }

  public static void updateLabelForReferralTracking(HasValues data) {
    new Bundle().find(ReferralTracking.TYPE).whereEquals(ReferralTracking.container, data.key()).update(item -> {
      item.updateLabels();
      return true;
    });
  }

  public static boolean checkToDoIsEnableToBeGenerated(String code, Bundle bundle) {
    List<String> inactiveToDos = bundle.ensure(AutoToDoConfig.TYPE, 1L).get(AutoToDoConfig.inactive_todo, Arrays.asList());
    return Strings.isEmpty(code) || !inactiveToDos.contains(code);
  }

  public static void initInternalAuditItem() {
    List<HasValues> items = Colls.asList(FieldsBase.create().set(AuditItems.name, "Unlicensed Activities - Quote Rate").set(AuditItems.is_enable, true),
            FieldsBase.create().set(AuditItems.name, "Unlicensed Activities - Explaining LE/CD/Closing Costs").set(AuditItems.is_enable, true),
            FieldsBase.create().set(AuditItems.name, "Fraud - Signature Forgery").set(AuditItems.is_enable, true).set(AuditItems.default_audit_status, AuditStatus.not_available),
            FieldsBase.create().set(AuditItems.name, "Fraud - Document Fabrication").set(AuditItems.is_enable, true),
            FieldsBase.create().set(AuditItems.name, "Fraud - Occupancy Fraud").set(AuditItems.is_enable, true),
            FieldsBase.create().set(AuditItems.name, "State Disclosures present?").set(AuditItems.is_enable, true),
            FieldsBase.create().set(AuditItems.name, "Loan Type disclosure").set(AuditItems.is_enable, true).set(AuditItems.default_audit_status, AuditStatus.not_available),
            FieldsBase.create().set(AuditItems.name, "Purchase - 3-way call with realtor, LOA, and LP").set(AuditItems.is_enable, false),
            FieldsBase.create().set(AuditItems.name, "Purchase - Important dates are inputted correctly").set(AuditItems.is_enable, false)
    );

    Bundle bundle = new Bundle();
    items.forEach(item -> {
      if (!bundle.find(AuditItems.TYPE).whereEquals(AuditItems.name, item.get(AuditItems.name)).exists()) {
        Bean bean = bundle.create(AuditItems.TYPE);
        bean.copyFrom(item);
      }
    });

    bundle.commit();
  }

  public static void sendEmailWhenChangeOwnerTicket(CanBeStored<?> bean, String template) {
    if (bean.isChanged(Ticket.owner) && bean.hasValue(Ticket.owner)) {
      List<String> recipients = new ArrayList<>();
      recipients.add(bean.get(Ticket.owner.dot(Admin.company_email_name)));
      if (bean.hasValue(Ticket.requested_user) && bean.load(Ticket.requested_user).typeis(Admin.TYPE)) {
        recipients.add(bean.get(Ticket.requested_user.dot(Admin.company_email_name)));
      }
      String note = bean.isChanged(Ticket.last_note) ? bean.get(Ticket.last_note.dot(Note.content)) : "";
      Server.queueService(QueueType.EMAIL).addTask(EmailTemplateOp.class,
              JSON.make(EmailParams.template, template)
                      .set("root", bean.key())
                      .set("note", note)
                      .set(Template.to, recipients));
    }
  }

  public static void updateAUSAppraisalWaiveWorkflow(CanBeStored<?> loan) {
    Bean data = (Bean) loan;
    if (LoanUtils.isLoan(loan)) {
      if (loan.hasValue(Loan.aus_appraisal_waiver)) {
        if (loan.is(Loan.aus_appraisal_waiver)) {

          loan.set(Loan.is_inspection_waiver, true)
                  .set(Loan.appraisal_not_waived, false)
                  .set(Loan.appraisal_ordered, AppraisalStatus.Waived);

          LoanOps.createWorkflowTasks(data, Loan.WAIVE_APPRAISAL_WORKFLOW);
          LoanOps.checkWorkflowTask(data, Loan.WAIVE_APPRAISAL_WORKFLOW);
          LoanOps.deleteWorkflowTasks(data, Loan.appraisal_not_waived.name(),
                  LoanWorkFlows.getHeader(loan) + Loan.ORDER_APPRAISAL_EVENT,
                  LoanWorkFlows.getHeader(loan) + Loan.APPRAISAL_ENTER_EVENT);
        } else {
          loan.set(Loan.appraisal_not_waived, true)
                  .set(Loan.is_inspection_waiver, false)
                  .set(Loan.appraisal_ordered, AppraisalStatus.No);

          LoanOps.createWorkflowTasks(data, Loan.appraisal_not_waived.name(), LoanWorkFlows.getHeader(loan) + Loan.ORDER_APPRAISAL_EVENT);
          LoanOps.checkWorkflowTask(data, Loan.appraisal_not_waived.name());
          LoanOps.deleteWorkflowTasks(data, Loan.WAIVE_APPRAISAL_WORKFLOW);
        }
      } else {

        loan.set(Loan.appraisal_not_waived, false)
                .set(Loan.is_inspection_waiver, false)
                .set(Loan.appraisal_ordered, AppraisalStatus.No);

        LoanOps.unCheckWorkflowTask((Bean) loan, Loan.WAIVE_APPRAISAL_WORKFLOW, Loan.appraisal_not_waived.name());
        LoanOps.createWorkflowTasks(data, Loan.appraisal_not_waived.name(), Loan.WAIVE_APPRAISAL_WORKFLOW);
        LoanOps.deleteWorkflowTasks(data, LoanWorkFlows.getHeader(loan) + Loan.ORDER_APPRAISAL_EVENT,
                LoanWorkFlows.getHeader(loan) + Loan.APPRAISAL_ENTER_EVENT);
      }
    }
  }

  public static void updateAUSWaiverLabel(CanBeStored<?> loan) {
    if (loan.hasValue(Loan.du_ami_llpa_waiver) && loan.isNot(Loan.du_ami_llpa_waiver)) {
      LoanOps.createSystemNote(loan, Loan.AUS_NO_AMI, Collections.singletonList(Loan.ADMIN_NOTE_LABEL));
    }

  }

  public static boolean isEnableAgentFinder() {
    Bean config = new Bundle().get(RealtorReferralConfig.TYPE, 1l);
    if (config == null) {
      return false;
    }
    return Modules.modules.isEnableModule(ReferralAgentMod.REFERRAL_AGENT) && config.is(RealtorReferralConfig.is_enable_realtor_network);
  }

  /***
   * Cache keys for non-license settings and active licenses
   *
   */
  public static String COMPANY_NON_LICENSE_SETTING_CACHE_KEY = "company_non_license_settings";
  public static String COMPANY_ACTIVE_LICENSE_CACHE_KEY = "company_active_licenses";

  public static List<HasValues> getNonLicenseSetting() {
    /**
     * * NonLicenseSettings are cached in ThreadContext to avoid multiple cache and DB calls
     */
    return ThreadContext.get(COMPANY_NON_LICENSE_SETTING_CACHE_KEY, LoanOps::getNonLicenseSettingFromCached);
  }

  public static List<HasValues> getActiveLicense() {
    /**
     *
     * ActiveLicenses are cached in ThreadContext to avoid multiple cache and DB calls
     */
    return ThreadContext.get(COMPANY_ACTIVE_LICENSE_CACHE_KEY, LoanOps::getActiveLicenseFromCached);
  }


  public static List<HasValues> getNonLicenseSettingFromCached() {
    List<HasValues> cache = Server.cache().get(COMPANY_NON_LICENSE_SETTING_CACHE_KEY);
    if (cache != null) {
      return cache;
    } else {
      cache = new Bundle().find(NonLicenseSetting.TYPE).list().stream().filter(Objects::nonNull).map(Bean::toMap).collect(Collectors.toList());
      Server.cache().put(COMPANY_NON_LICENSE_SETTING_CACHE_KEY, cache);
    }
    return cache;
  }

  public static List<HasValues> getActiveLicenseFromCached() {
    List<HasValues> cache = Server.cache().get(COMPANY_ACTIVE_LICENSE_CACHE_KEY);
    if (cache != null) {
      return cache;
    } else {
      cache = new Bundle().find(License.TYPE).whereEquals(License.active, true).list().stream().map(Bean::toMap).collect(Collectors.toList());
      Server.cache().put(COMPANY_ACTIVE_LICENSE_CACHE_KEY, cache);
    }
    return cache;
  }

  public static Quote.CompensationType getDefaultCompensationType() {
    Quote.CompensationType compensationType;
    String anonymousId = Server.anonymousAdminId();
    if (anonymousId != null) {
      Bean loConfig = new Bundle().get(Admin.TYPE, anonymousId);
      if (loConfig != null) {
        compensationType = loConfig.get(Admin.default_compensation_type, Quote.CompensationType.borrower_paid);
      } else {
        compensationType = Quote.CompensationType.borrower_paid;
      }
    } else {
      CanBeStored quoteConfig = bucket().get(QuoteConfiguration.TYPE, Server.getCompanyId());
      compensationType = quoteConfig != null ? quoteConfig.get(QuoteConfiguration.default_compensation_type, Quote.CompensationType.lender_paid) : Quote.CompensationType.lender_paid;
    }
    return compensationType;
  }

  public static Double _generateCompensationDetails(Bean loan, StringBuilder compensationDetails) {
    // Reverse Mortgage compensation
    if (loan.is(Loan.loan_type, LoanType.reserve_mortgage)) {
      if (loan.hasValue(Loan.reverse_mortgage_compensation)) {
        return appendSpecialMortgageComp(loan, Loan.reverse_mortgage_compensation, compensationDetails);
      }
      // for old loans which don't have reverse_mortgage_compensation use normal formula
    } else if (loan.is(Loan.loan_type, LoanType.Commercial) && loan.hasValue(Loan.commercial_mortgage_compensation)) {
      return appendSpecialMortgageComp(loan, Loan.commercial_mortgage_compensation, compensationDetails);
    }

    Long lenderId = getLenderId(loan);
    Bean lenderAgreement = lenderId == null ? null : new Bundle().get(LenderAgreement.TYPE, lenderId);
    HasValues lenderRebate = lenderAgreement == null ? null :
            findCompensation(loan.get(Loan.branch), loan.get(Loan.state), lenderAgreement.get(LenderAgreement.rebates), RebatesRow.state);

    LenderType lenderType = LenderType.fromId(lenderId);
    // Pylon: LF margin is structural (org margin − PYLON_MARGIN); no cap, no rebate, ignores compensation_type by design.
    if (lenderType == LenderType.Pylon) {
      double lfMargin = PylonMargin.getLoanFactoryMargin();
      compensationDetails.append("Loan Factory margin = ");
      Double grossComp = appendCompensationCalculator(compensationDetails, lfMargin, loan.get(total_loan_amount));
      return appendPylonConcession(compensationDetails, loan, grossComp);
    }

    // Correspondent loan
    boolean isCorrespondent = (lenderType != null && lenderType.isCorrespondent())
            || (lenderAgreement != null && lenderAgreement.is(LenderAgreement.is_correspondent));
    if (isCorrespondent) {
      compensationDetails.append("Compensation = ");
      return appendBorrowerPaidCompensation(compensationDetails, loan, lenderRebate);
    }

    Quote.CompensationType compensationType = loan.get(Loan.compensation_type, getDefaultCompensationType());
    // Wholesale: Borrower-paid compensation
    if (compensationType == Quote.CompensationType.borrower_paid ||
            (lenderAgreement != null && lenderAgreement.is(LenderAgreement.borrower_paid_only))) {
      compensationDetails.append("Borrower Paid = ");
      return appendBorrowerPaidCompensation(compensationDetails, loan, lenderRebate);
    }

    // Wholesale: Lender-paid compensation
    //       Locked loan
    if (loan.is(Loan.locked) && loan.hasValue(Loan.commission_percent)) {
      Double lpc = loan.get(Loan.loan_lpc, loan.get(Loan.commission_percent));
      Double flatProccessingFee = loan.get(Loan.flat_processing_fee);
      compensationDetails.append("Lender Paid = ");
      Double compensationAmount = appendCompensationCalculator(compensationDetails, lpc, loan.get(total_loan_amount));
      compensationAmount = appendMinMaxCompensationAmount(compensationDetails, lenderRebate, compensationAmount);
      compensationAmount = appendFlatProcessingFee(compensationDetails, flatProccessingFee, compensationAmount);
      return compensationAmount;
    }
    //       Not-locked loan or locked loan with missing commission_percent
    if (lenderRebate != null) {
      Double lpc = loan.get(Loan.loan_lpc, QuoteUtils.getLPC(lenderRebate, loan.get(Loan.purpose)));
      Double flatProccessingFee = lenderRebate.get(RebatesRow.flat_processing_fee);
      compensationDetails.append("Lender Paid = ");
      Double compensationAmount = appendCompensationCalculator(compensationDetails, lpc, loan.get(total_loan_amount));
      compensationAmount = appendMinMaxCompensationAmount(compensationDetails, lenderRebate, compensationAmount);
      compensationAmount = appendFlatProcessingFee(compensationDetails, flatProccessingFee, compensationAmount);
      return compensationAmount;
    }
    return null;

  }

  private static Double appendSpecialMortgageComp(Bean loan, Field<Double> mortgageComField, StringBuilder compensationDetails) {
    Double mortgageComp = loan.get(mortgageComField);
    Quote.CompensationType compensationType = loan.get(Loan.compensation_type, getDefaultCompensationType());
    if (compensationType == Quote.CompensationType.borrower_paid) {
      compensationDetails.append("Borrower Paid = ");
    } else {
      compensationDetails.append("Lender Paid = ");
    }
    return appendCompensationCalculator(compensationDetails, mortgageComp, loan.get(total_loan_amount));
  }

  public static Double generateCompensationDetails(Bean loan) {
    StringBuilder compensationDetails = new StringBuilder();
    Double compensation = _generateCompensationDetails(loan, compensationDetails);
    if (!compensationDetails.isEmpty()) {
      loan.set(Loan.broker_compensation_details, compensationDetails.toString());
    }
    // ensure mortgage_compensation for old loan or when loan_type changed to Reverse Mortgage or Commercial
    if (loan.is(Loan.loan_type, LoanType.reserve_mortgage) && !loan.hasValue(Loan.reverse_mortgage_compensation)) {
      loan.set(Loan.reverse_mortgage_compensation, compensation);
    } else if (loan.is(Loan.loan_type, LoanType.Commercial) && !loan.hasValue(Loan.commercial_mortgage_compensation)) {
      loan.set(Loan.commercial_mortgage_compensation, compensation);
    }
    return compensation;
  }

  private static Double appendFlatProcessingFee(StringBuilder compensationDetails, Double flatProccessingFee, Double compensationAmount) {
    if (flatProccessingFee != null && flatProccessingFee != 0) {
      compensationDetails.append(String.format(" + Flat processing fee of %s = %s",
              formatWholeDollarUS(flatProccessingFee),
              formatWholeDollarUS(flatProccessingFee + compensationAmount)));
      return flatProccessingFee + compensationAmount;
    }
    return compensationAmount;


  }

  private static Double appendBorrowerPaidCompensation(StringBuilder compensationDetails, Bean loan, HasValues lenderRebate) {
    if (!loan.hasValue(Loan.borrower_paid_compensation)) {
      compensationDetails.append("undefined");
      return null;
    }

    Double compensationCap = lenderRebate == null ? null : lenderRebate.get(RebatesRow.purchase_lpc);
    Double companyMaxComp = LoanOps.getMaximumCompensation();
    if (compensationCap == null) {
      compensationCap = companyMaxComp;
    } else if (companyMaxComp != null && companyMaxComp < compensationCap) {
      compensationCap = companyMaxComp;
    }

    Double compensation = loan.get(Loan.borrower_paid_compensation);
    Double totalLoanAmount = loan.get(Loan.total_loan_amount);
    Double compensationAmount;
    if (compensationCap != null && compensation > compensationCap) {
      compensationDetails.append(String.format("%s (> Max %s) = ",
              DecimalType.percentage().display(compensation),
              DecimalType.percentage().display(compensationCap)));

      compensationAmount = appendCompensationCalculator(compensationDetails, compensationCap, totalLoanAmount);
    } else {
      compensationAmount = appendCompensationCalculator(compensationDetails, compensation, totalLoanAmount);
    }
    return compensationAmount;
  }

  /**
   * Formats a dollar amount for storage in broker_compensation_details using a fixed US locale.
   * Must NOT use DecimalType.wholeDollar().display() here — that method is locale-sensitive
   * (depends on ThreadContext.language()), so users with non-English language preferences would
   * produce a different string (e.g. "480.000 US$" instead of "$480,000"), causing spurious
   * audit-log entries every time any such user saves the loan.
   */
  private static String formatWholeDollarUS(Double value) {
    if (value == null) {
      return "$0";
    }
    return String.format(Locale.US, "$%,.0f", value);
  }

  @NotNull
  public static Double appendCompensationCalculator(StringBuilder compensationDetails, Double compensation, Double totalLoanAmount) {
    Double compensationAmount;
    compensationAmount = compensation * totalLoanAmount / 100d;
    compensationDetails.append(String.format("%s * %s = %s",
            DecimalType.percentage().display(compensation),
            formatWholeDollarUS(totalLoanAmount),
            formatWholeDollarUS(compensationAmount)));
    return compensationAmount;
  }

  /**
   * Dollar value of the concession applied to the attached Pylon product — the single source
   * of truth for the concession folded into the compensation display and netted from
   * {@code Loan.commission}. Derived from the applied-on-product snapshot
   * ({@link PylonLoan#attached_concession_points}, in points against
   * {@link PylonLoan#attached_loan_amount}); deliberately NOT the desired/submitted concession
   * from the Pylon fees API. Returns 0 when there is no positive concession, no attached loan
   * amount, or the loan is not a Pylon loan (no {@code pylon_loan_id} → dot-ref is null).
   */
  public static double pylonConcessionDollars(Bean loan) {
    Double concessionPoints = loan.get(Loan.pylon_loan_id.dot(PylonLoan.attached_concession_points));
    Double attachedLoanAmount = loan.get(Loan.pylon_loan_id.dot(PylonLoan.attached_loan_amount));
    if (concessionPoints == null || concessionPoints <= 0d
            || attachedLoanAmount == null || attachedLoanAmount <= 0d) {
      return 0d;
    }
    return concessionPoints / 100d * attachedLoanAmount;
  }

  /**
   * Appends the applied product concession to the Pylon compensation DISPLAY string as a
   * " - Concession $X = $net" line, so General Info shows the net figure.
   * <p><b>Returns the GROSS comp unchanged</b> — the concession is intentionally NOT subtracted
   * from the return value. That value is the shared "compensation amount" other consumers treat
   * as gross LPC (e.g. {@code LoadPylonDrawerDataOp}'s {@code pricingLpc} → the lock-drawer
   * breakdown, which subtracts the concession itself; ExportLoansOp's compensation columns).
   * Net figures are derived explicitly by callers via {@link #pylonConcessionDollars} — keeping
   * gross vs. net a caller decision rather than silently overloading this primitive.
   * No-op when there is no positive concession.
   */
  private static Double appendPylonConcession(StringBuilder compensationDetails, Bean loan, Double grossComp) {
    double concessionDollars = pylonConcessionDollars(loan);
    if (grossComp == null || concessionDollars <= 0d) {
      return grossComp;
    }
    double netComp = grossComp - concessionDollars;
    compensationDetails.append(String.format(" - Concession %s = %s",
            formatWholeDollarUS(concessionDollars),
            formatWholeDollarUS(netComp)));
    return grossComp;
  }

  private static Double appendMinMaxCompensationAmount(StringBuilder compensationDetails, HasValues lenderRebate, Double compensationAmount) {
    if (lenderRebate != null) {
      Double minCom = lenderRebate.get(RebatesRow.min_com);
      Double maxCom = lenderRebate.get(RebatesRow.max_com);
      if (minCom != null && compensationAmount < minCom) {
        compensationDetails.append(" (Min ").append(formatWholeDollarUS(minCom)).append(")");
        return minCom;
      } else if (maxCom != null && compensationAmount > maxCom) {
        compensationDetails.append(" (Max ").append(formatWholeDollarUS(maxCom)).append(")");
        return maxCom;
      }
    }
    return compensationAmount;
  }


  private static Long getLenderId(Bean loan) {
    if (loan.hasValue(Loan.lender_id)) {
      return loan.get(Loan.lender_id);
    }
    LenderType lenderType = loan.get(Loan.alert_lender, loan.get(Loan.quote_lender));
    return lenderType != null ? lenderType.id() : null;
  }

  public static void generateBorrowerPaidCompensationToDo(Bean loan) {
    JSON condition = JSON.empty();
    if (loan.is(Loan.compensation_type, Quote.CompensationType.borrower_paid)) {
      if (loan.isChanged(Loan.borrower_paid_compensation) || loan.isChanged(Loan.compensation_type) || loan.isChanged(Loan.transaction_type)) {
        TodoHandler.deleteToDo(conditionCodes.borrower_paid_compensation_code(), null);
        TodoHandler.deleteToDo(conditionCodes.borrower_paid_change_compensation_code(), null);
        if (loan.getOldValues().is(Loan.compensation_type, Quote.CompensationType.lender_paid)) {
          condition.set(Condition.details, loanMessages.borrower_paid_change_compensation_desc(loan.get(Loan.broker_compensation_details)))
                  .set(Condition.code, conditionCodes.borrower_paid_change_compensation_code());
        } else {
          condition.set(Condition.details, loanMessages.borrower_paid_compensation_desc(loan.get(Loan.broker_compensation_details)))
                  .set(Condition.code, conditionCodes.borrower_paid_compensation_code());
        }
      }
    } else {
      TodoHandler.deleteToDo(conditionCodes.borrower_paid_compensation_code(), null);
      TodoHandler.deleteToDo(conditionCodes.borrower_paid_change_compensation_code(), null);

    }

    if (condition.isNotBlank()) {
      for (ConditionOwnerType conditionOwnerType : Colls.asList(ConditionOwnerType.Loan_originator_assistant, ConditionOwnerType.Loan_originator)) {
        condition.set(Condition.owner_type, conditionOwnerType);
        LoanOps.ensureCondition(loan, condition);
      }
    }
  }

  public static void ensureExternalPartner(HasValues loan, Bundle bundle) {
    if (loan.hasValue(Loan.buyer_agent)) {
      Bean buyer = bundle.get(Realtor.TYPE, loan.get(Transaction.buyer_agent));
      if (buyer != null && buyer.hasValue(email)) {
        Bean externalRealtor = bundle.find(PartnerAgent.TYPE).whereEquals(email, buyer.get(Loan.email)).first();
        if (externalRealtor == null) {
          externalRealtor = bundle.get(PartnerAgent.TYPE, buyer.get(email));
          if (externalRealtor == null) {
            externalRealtor = bundle.ensure(PartnerAgent.TYPE, buyer.get(email));
            externalRealtor.set(PartnerAgent.realtor_type, RealtorType.external_realtor);
          }
        }

        if (externalRealtor.is(PartnerAgent.realtor_type, RealtorType.internal_realtor)) {
          return;
        }

        if (externalRealtor.isNew()) {
          externalRealtor.set(email, buyer.get(email))
                  .set(PartnerAgent.realtor_type, RealtorType.external_realtor)
                  .set(PartnerAgent.specialty, Colls.asList(RealtorSpecialtyType.buyer_agent, RealtorSpecialtyType.listing_agent))
                  .set(PartnerAgent.active, true)
                  .set(PartnerAgent.state, loan.get(Loan.state));
        }

        externalRealtor.set(PartnerAgent.first_name, buyer.get(Contact.first_name))
                .set(PartnerAgent.last_name, buyer.get(Contact.last_name))
                .set(PartnerAgent.phone, buyer.get(Contact.phone))
                .set(PartnerAgent.company, buyer.get(Contact.organization));

        for (LanguageLibrary language : loan.get(Loan.languages_realtor, new ArrayList<>())) {
          externalRealtor.add(PartnerAgent.preferred_languages, true, language);
        }

        Bean zip = bundle.get(ZipCode.TYPE, loan.get(Loan.zip));
        if (zip != null) {
          externalRealtor.add(PartnerAgent.base_county, true, zip.get(ZipCode.county_name));
        }
        externalRealtor.save();
      }
    }
  }

  public static String generateBankStateProblemLink(HasValues doc, DocumentAIConfiguration.DocAIType docAIType) {
    if (doc == null) {
      return "";
    }
    String icon = "<i class=\"fa fa-info-circle\" style = \"color:red;\"></i>";

    if (docAIType.equals(DocumentAIConfiguration.DocAIType.bank_statement)) {
      if (doc.is(BankStatementDoc.is_valid)) {
        icon = "<i class=\"fas fa-check-circle\" style = \"color:green;\"></i>";
      }
      return "&nbsp;<a href=\"##/" + LoanSection.document_api_compare_data + "?id=" + doc.id() + "&" + DocumentAIConfiguration.valid.name() + "=" + doc.get(BankStatementDoc.is_valid)
              + "&" + DocumentAIConfiguration.doc_type.name() + "=" + docAIType.name() + "\">" + icon + "</a>";
    } else {
      if (doc.is(W2SEntity.is_valid)) {
        icon = "<i class=\"fas fa-check-circle\" style = \"color:green;\"></i>";
      }
      return "&nbsp;<a href=\"##/" + LoanSection.document_api_compare_data + "?id=" + doc.id() + "&" + DocumentAIConfiguration.valid.name() + "=" + doc.get(W2SEntity.is_valid)
              + "&" + DocumentAIConfiguration.doc_type.name() + "=" + docAIType.name() + "\">" + icon + "</a>";
    }
  }

  public static boolean checkBankStatementName(Bundle bundle, String bankName, String docBankName) {
    if (bankName.toLowerCase().equals(docBankName.toLowerCase())) {
      return true;
    }

    List<Bean> bankNameSettings = bundle.find(BankNameDictionary.TYPE).whereEquals(BankNameDictionary.labels, Colls.asList(bankName)).list();
    if (Colls.isNotEmpty(bankNameSettings)) {
      for (Bean setting : bankNameSettings) {
        if (setting.get(BankNameDictionary.aliases).contains(docBankName)) {
          return true;
        }
      }
    }
    return false;
  }

  public static List<Bean> getListReferralRealtorTransaction(Bundle bundle, HasValues referralRealtor) {
    Set<Bean> result = new HashSet<>();
    if (referralRealtor != null && referralRealtor.hasValue(email)) {
      List<Bean> realtors = bundle.find(Realtor.TYPE).whereEquals(Realtor.email, referralRealtor.get(PartnerAgent.email)).list();

      realtors.forEach(item -> {
        List<Bean> transactions = bundle.find(Loan.TYPE)
                .whereEquals(Loan.buyer_agent, item.id()).list();
        if (Colls.isNotEmpty(transactions)) {
          if (referralRealtor.is(PartnerAgent.realtor_type, RealtorType.internal_realtor)) {
            if (referralRealtor.is(PartnerAgent.status, ReferralAgentStatus.Active)) {
              transactions.forEach(loan -> {
                if (!loan.hasValue(Loan.referral_partner)) {
                  loan.set(Loan.referral_partner, referralRealtor.key())
                          .set(Loan.is_buyer_company, false);
                  loan.save();
                }
              });
            }
          } else {
            result.addAll(transactions);
          }
        }
      });

      if (referralRealtor.is(PartnerAgent.realtor_type, RealtorType.internal_realtor)) {
        result.addAll(bundle.find(Loan.TYPE)
                .whereEquals(Loan.referral_partner, referralRealtor.key()).list());
      }
    }

    List<Bean> loans = new ArrayList<>();
    loans.addAll(result);
    return loans;
  }

  public static String checkMLOCompensationForLO(Bundle bundle, List<String> agentLicenseStates, String fullName) {
    if (Colls.isEmpty(agentLicenseStates)) {
      return null;
    }

    List<Bean> activeLicenses = bundle.find(License.TYPE)
            .whereEquals(License.active, true)
            .list();

    Set<String> statesW2 = new HashSet<>();
    Set<String> statesBothOr1099 = new HashSet<>();

    for (Bean license : activeLicenses) {
      String state = license.get(License.state);
      License.MLOCompensationType type = license.get(License.mlo_compensation);
      if (type == License.MLOCompensationType.W_2) {
        statesW2.add(state);
      } else if (type == License.MLOCompensationType.Both || type == License.MLOCompensationType._1099) {
        statesBothOr1099.add(state);
      }
    }

    List<String> unacceptableStates = agentLicenseStates.stream()
            .filter(statesW2::contains)
            .filter(state -> !statesBothOr1099.contains(state))
            .collect(Collectors.toList());

    if (Colls.isEmpty(unacceptableStates)) {
      return null;
    }

    return AdminPageMessages.adminPageMessages.warning_mlo_compensation_message_license_for_independent_lo(
            Strings.join(unacceptableStates.stream().map(States.states::get).collect(Collectors.toList()), ", "), fullName);
  }

  public static String getLicenseNumberForTexas(HasValues agent) {
    if (agent.hasValue(Admin.agent_licenses)) {
      for (HasValues license : agent.get(Admin.agent_licenses)) {
        if (license.is(License.state, Loan.TEXAS_STATE)) {
          return license.get(License.number);
        }
      }
    }
    return null;
  }

  public static String getLenderAgreementSortOrder(CanBeStored<?> agreement) {
    HasValues lender = agreement.load(LenderAgreement.lender);
    if (lender == null) {
      return "224";
    }
    String order = lender.is(Lender.active) ? "1" : "2";
    order += agreement.is(LenderAgreement.active) ? "1" : "2";
    order += LenderTierType.getPriority(agreement.get(LenderAgreement.lender_tier));
    order += agreement.get(LenderAgreement.alias, "");
    return order;
  }

  public static String getCompanyDirectorySortOrder(CanBeStored<?> user) {
    if (user.is(Admin.marketplace_role) && user.hasValue(Admin.live_room_url) && user.is(Admin.live_internal)) {
      if (user.is(Admin.marketplace_online)) {
        return user.is(Admin.is_loan_originator) ? "15" : "10";
      }
      return "20";
    }
    return "30";
  }

  public static List<Bean> getListReferrerLO(Bundle bundle, HasValues admin) {
    return bundle.find(Loan.TYPE).whereEquals(Loan.referrer_lo, admin.keyName())
            .whereEquals(Loan.referrer_linked_media, ReferrerType.Referral_Loan_Officer.id()).list();
  }

  public static List<Bean> getListAdminInternalReviews(Bean admin, Bundle bundle) {
    List<Bean> reviews = new ArrayList<>();
    final QueryBuilder<Bean> query = bundle.find(ReviewColleagues.TYPE);
    query.whereEquals(ReviewColleagues.active, true);
    if (admin != null) {
      query.whereEquals(ReviewColleagues.reviewee, admin.keyName());
    }
    Tuple2<String, List<Bean>> chunk = query.getChunk(100, null);
    String nextCursor = chunk.getKey();

    while (nextCursor != null && Colls.isNotEmpty(chunk.getValue())) {
      reviews.addAll(chunk.getValue());

      chunk = query.getChunk(100, nextCursor);
      nextCursor = chunk.getKey();
    }
    bundle.commit();
    return reviews;
  }

  public static void clearInternalReviewLoansCache(Bean admin, boolean clearAll) {
    Colls.asList(CountingType.lo_review, CountingType.loa_review, CountingType.condition_processor_review, CountingType.processor_review).forEach(countingType -> {
      if (clearAll) {
        Server.cache().delete(PerformanceReportUtils.internalReviewLoanCache(countingType, null, null));
        for (Integer i = 1; i <= 5; i++) {
          Server.cache().delete(PerformanceReportUtils.internalReviewLoanCache(countingType, i, null));
        }
      } else if (admin != null) {
        Server.cache().delete(PerformanceReportUtils.internalReviewLoanCache(countingType, null, admin));
        for (Integer i = 1; i <= 5; i++) {
          Server.cache().delete(PerformanceReportUtils.internalReviewLoanCache(countingType, i, admin));
        }
      }
    });
  }

  public static List<HasValues> getLoansInternalReview(JSON input, Bundle bundle) {
    Bean admin = input.hasValue(ReviewColleagues.reviewee) ? bundle.get(Admin.TYPE, input.get(ReviewColleagues.reviewee)) : null;
    return Server.cache().get(internalReviewLoanCache(input.get(PerformanceReport.counting_type), input.get(ReviewColleagues.rate), admin), (key) -> {
      List<HasValues> rows = new ArrayList<>();
      List<Bean> reviews = LoanOps.getListAdminInternalReviews(admin, bundle);
      reviews.forEach(review -> {
        Bean loan = review.load(ReviewColleagues.loan_id);
        if (loan != null) {
          if ((!input.hasValue(ReviewColleagues.rate) || review.is(ReviewColleagues.rate, input.get(ReviewColleagues.rate))) &&
                  (admin == null || admin.keyName().equals(loan.get(ReviewColleagues.LOAN_FIELD_MAP.get(input.get(PerformanceReport.counting_type)))))) {
            rows.add(loan.toMap());
          }
        }

      });
      return rows;
    });
  }

  public static Double getMaximumCompensation() {
    Bean commisionConfig = new Bundle().get(CommissionConfiguration.TYPE, 1L);
    return commisionConfig != null && commisionConfig.is(CommissionConfiguration.has_compensation_cap) ? commisionConfig.get(CommissionConfiguration.max_compensation) : null;
  }

  public static Map<String, Object> getLoanProgramsOp(JSON loan) {
    try {
      return new GetLoanPrograms().execute(loan);
    } catch (Exception ex) {
      ex.printStackTrace();
      return new HashMap<>();
    }
  }

  public static void ensureDefaultClosingFee(Bundle bundle, Bean admin) {
    DEFAULT_CUSTOM_FEE_SECTIONS.forEach(leSection -> {
      final QueryBuilder<Bean> query = bundle.find(CustomClosingFee.TYPE)
              .whereEquals(CustomClosingFee.le_form_section, leSection)
              .whereEquals(CustomClosingFee.for_broker, true);
      if (!query.exists()) {
        Bean customFee = bundle.create(CustomClosingFee.TYPE)
                .set(CustomClosingFee.custom_fee_type, CustomClosingFee.CustomFeeType.closing)
                .set(CustomClosingFee.le_form_section, leSection)
                .set(CustomClosingFee.can_delete, false)
                .set(CustomClosingFee.fee_name, leSection.toString())
                .set(CustomClosingFee.for_broker, true);
        if (leSection.equals(LEFormSection.F)) {
          customFee.set(CustomClosingFee.month_of_homeowner_insurance, 12)
                  .set(CustomClosingFee.month_of_mortgage_insurance, 12)
                  .set(CustomClosingFee.day_of_prepaid_interest, 15)

                  .set(CustomClosingFee.month_of_homeowner_insurance_rf, 0)
                  .set(CustomClosingFee.month_of_mortgage_insurance_rf, 0)
                  .set(CustomClosingFee.months_of_property_tax_rf, 0)
                  .set(CustomClosingFee.day_of_prepaid_interest_rf, 15);
        }
        bundle.add(customFee);
      }
    });

    Colls.asList(HousingExpense.hazard_insurance.label(), lenderMessages.mortgage_insurance(), lenderMessages.property_taxes(), lenderMessages.hoa_dues())
            .forEach(feeName -> {
              QueryBuilder<Bean> query = bundle.find(CustomClosingFee.TYPE)
                      .whereEquals(CustomClosingFee.fee_name, feeName)
                      .whereEquals(CustomClosingFee.custom_fee_type, CustomClosingFee.CustomFeeType.escrow)
                      .whereEquals(CustomClosingFee.for_broker, true);
              if (!query.exists()) {
                Bean customFee = bundle.create(CustomClosingFee.TYPE)
                        .set(CustomClosingFee.custom_fee_type, CustomClosingFee.CustomFeeType.escrow)
                        .set(CustomClosingFee.can_delete, false)
                        .set(CustomClosingFee.use_tax_and_insurance_setting, true)
                        .set(CustomClosingFee.fee_name, feeName)
                        .set(CustomClosingFee.for_broker, true);
                bundle.add(customFee);
              }
            });
    bundle.commit();
  }

  public static void updatePerformanceReportCompanyLeads(Bundle bundle, Bean admin) {
    Bean performanceReport = bundle.find(PerformanceReport.TYPE)
            .whereEquals(PerformanceReport.keyName, CountingType.company_leads_active_transaction + ":" + admin.keyName()).first();

    if (performanceReport == null) {
      performanceReport = bundle.create(PerformanceReport.TYPE, CountingType.company_leads_active_transaction + ":" + admin.keyName());
      performanceReport.set(PerformanceReport.container, admin.key())
              .set(PerformanceReport.counting_type, CountingType.company_leads_active_transaction)
              .set(PerformanceReport.name, admin.get(Admin.full_name))
              .set(PerformanceReport.branch, admin.get(Admin.branch));
    }

    if (admin.isNot(Admin.want_to_receive_company_lead) || admin.isNot(Admin.accept_to_use_company_lead)) {
      bundle.remove(performanceReport);
      performanceReport.delete();
      return;
    }

    int activeLeads = bundle.find(Loan.TYPE).whereEquals(Loan.agent, admin.keyName())
            .whereEquals(Loan.lo_accepted_invite_company_lead, true)
            .whereIn(Loan.loan_source, Arrays.asList(LoanSourceType.company_lead, LoanSourceType.company_facebook_leads))
            .whereEquals(Loan.filter_milestones, LoanStatus.Active.name())
            .whereEquals(Loan.transaction_type, TransactionType.Lead)
            .count(Integer.MAX_VALUE);

    int activeProspects = bundle.find(Loan.TYPE).whereEquals(Loan.agent, admin.keyName())
            .whereEquals(Loan.lo_accepted_invite_company_lead, true)
            .whereIn(Loan.loan_source, Arrays.asList(LoanSourceType.company_lead, LoanSourceType.company_facebook_leads))
            .whereEquals(Loan.filter_milestones, LoanStatus.Active.name())
            .whereEquals(Loan.has_application, true)
            .whereEquals(Loan.transaction_type, null)
            .count(Integer.MAX_VALUE);

    int activeLoans = bundle.find(Loan.TYPE).whereEquals(Loan.agent, admin.keyName())
            .whereEquals(Loan.lo_accepted_invite_company_lead, true)
            .whereIn(Loan.loan_source, Arrays.asList(LoanSourceType.company_lead, LoanSourceType.company_facebook_leads))
            .whereEquals(Loan.dead, false)
            .whereEquals(Loan.closed, false)
            .whereEquals(Loan.transaction_type, TransactionType.Loan)
            .count(Integer.MAX_VALUE);

    performanceReport.set(PerformanceReport.leads, activeLeads)
            .set(PerformanceReport.prospects, activeProspects)
            .set(PerformanceReport.loans, activeLoans)
            .set(PerformanceReport.total_active_lead,
                    performanceReport.get(PerformanceReport.leads) +
                            performanceReport.get(PerformanceReport.prospects) +
                            performanceReport.get(PerformanceReport.loans));

    if (performanceReport.is(PerformanceReport.total_active_lead, 0)) {
      bundle.remove(performanceReport);
      performanceReport.delete();
      return;
    }

    performanceReport.updateLabels();
    performanceReport.save();
  }

  public static void ensurePartnerAgentForLoan(Bean loan, Bundle bundle) {
    if (loan.hasValue(Loan.referral_partner)) {
      Bean partner = bundle.get(loan.get(Loan.referral_partner));

      if (partner != null && partner.is(PartnerAgent.realtor_type, RealtorType.internal_realtor)) {
        Bean buyerAgent = loan.hasValue(Loan.buyer_agent) ? bundle.get(Realtor.TYPE, loan.get(Loan.buyer_agent)) : null;
        if (buyerAgent == null) {
          buyerAgent = bundle.create(Realtor.TYPE);
        }

        loan.set(Loan.referral_partner, partner.key())
                .set(Loan.is_auto_fill_realtor, true)
                .set(Loan.languages_realtor, partner.get(PartnerAgent.preferred_languages));
        buyerAgent.set(Realtor.languages, partner.get(PartnerAgent.preferred_languages));
        buyerAgent.copyFrom(partner, Contact.first_name, Contact.last_name, Contact.email, Contact.phone, Contact.organization);
        buyerAgent.save();
        loan.set(Loan.buyer_agent, buyerAgent.id())
                .set(Loan.is_buyer_company, true);
      }
    }
  }

  public static void deleteGoogleCalendarEvent(CanBeStored<?> event) {
    if (event.hasValue(MarketplaceEvent.calendar_event_id)) {
      new GoogleCalendar(event.get(MarketplaceEvent.owner))
              .deleteEvent(event.get(MarketplaceEvent.calendar_event_id), false);
      // A stale id would later let showNextRepeatEvent's guard pass and let SaveMarketPlaceEventOp's
      // "update failed, create instead" fallback resurrect the event on Google Calendar.
      event.set(MarketplaceEvent.calendar_event_id, null);
    }
  }

  public static void deleteMarketplaceMilestoneSummaryCache(String ownerKey) {
    for (MarketplaceEvent.EventMilestone milestone : MarketplaceEvent.EventMilestone.values()) {
      Server.cache().delete(LoanUtils.marketplaceEventMileStoneCountField(milestone, null).name());
      Server.cache().delete(LoanUtils.marketplaceEventMileStoneCountField(milestone, ownerKey).name());
    }
  }

  public static void showNextRepeatEvent(Bundle bundle, HasValues event) {
    if (event.isNot(MarketplaceEvent.repeat_schedule, MarketplaceEvent.RepeatSchedule.do_not_repeat) && event.hasValue(MarketplaceEvent.calendar_event_id)) {
      int index = 0;
      HasValues tempoEvent = JSON.empty().copyFrom(event);
      while (index < 10) {
        Bean nextEvent = bundle.find(MarketplaceEvent.TYPE)
                .whereEquals(MarketplaceEvent.repeat_id, tempoEvent.get(MarketplaceEvent.repeat_id))
                .whereEquals(MarketplaceEvent.repeat_order, tempoEvent.get(MarketplaceEvent.repeat_order) + 1).first();
        if (nextEvent != null) {
          if (!Colls.asList(MarketplaceEventStatus.Cancelled, MarketplaceEventStatus.Rejected).contains(nextEvent.get(MarketplaceEvent.event_status))) {
            nextEvent.set(MarketplaceEvent.show_in_marketplace, true);
            if (!nextEvent.hasValue(MarketplaceEvent.calendar_event_id)) {
              try {
                Event newEvent = new Event();
                SaveMarketPlaceEventOp.setDataForEvent(newEvent, JSON.empty().copyFrom(nextEvent));
                List<EventAttendee> attendees = new ArrayList<>();
                if (nextEvent.hasValue(MarketplaceEvent.guests)) {
                  nextEvent.get(MarketplaceEvent.guests).forEach(email -> {
                    EventAttendee eventAttendee = new EventAttendee();
                    eventAttendee.setEmail(email);
                    attendees.add(eventAttendee);
                  });
                }
                newEvent.setAttendees(attendees);
                GoogleCalendar calendar = new GoogleCalendar(nextEvent.get(MarketplaceEvent.owner));
                boolean notifyGuests = SaveMarketPlaceEventOp.guestsContainGroup(nextEvent.get(MarketplaceEvent.guests));
                Event createdEvent = calendar.createEvent(newEvent, notifyGuests);
                nextEvent.set(MarketplaceEvent.calendar_event_id, createdEvent.getId());
                if (nextEvent.is(MarketplaceEvent.auto_generate_google_meet_link)) {
                  nextEvent.set(MarketplaceEvent.event_url, createdEvent.getConferenceData().getEntryPoints().get(0).getUri());
                }
              } catch (Exception e) {
                e.printStackTrace();
              }
            }
            nextEvent.save();
            break;
          } else {
            tempoEvent = nextEvent;
          }
        } else {
          tempoEvent.set(MarketplaceEvent.repeat_order, tempoEvent.get(MarketplaceEvent.repeat_order) + 1);
        }
        index++;
      }

    }
  }

  public static List<HasValues> getRatesForAntiSteeringDoc(HasValues loan) {
    List<HasValues> rates = new ArrayList<>();
    Bundle bundle = new Bundle();
    final JSON data = JSON.empty().copyFrom(loan, Loan.TYPE.fields());
    HasValues lender = null;
    if (loan.hasValue(Loan.lender_id)) {
      lender = bundle.get(LenderAgreement.TYPE, loan.get(Loan.lender_id));
    }
    if (lender == null || lender.isNot(LenderAgreement.active)) {
      final Bean disclosureSetting = bundle.get(DisclosureDocumentConfig.TYPE, GenerateDocType.Anti_Steering_Optional.getTemplateName());
      if (disclosureSetting != null && disclosureSetting.hasValue(DisclosureDocumentConfig.anti_steering_disclosure_settings)) {
        List<HasValues> antiSteeringSettings = disclosureSetting.get(DisclosureDocumentConfig.anti_steering_disclosure_settings).stream()
                .filter(s -> loan.get(Loan.loan_type).equals(s.get(DisclosureSetting.loan_type))).collect(Collectors.toList());
        if ((Colls.isNotEmpty(antiSteeringSettings))) {
          data.set(Loan.alert_lender, LenderType.fromId(antiSteeringSettings.get(0).get(DisclosureSetting.lender)));
        }
      }
    }
    boolean isNonQM = loan.is(Loan.loan_type, LoanType.Non_QM);
    if (isNonQM) {
      data.set(Quote.mortgage_lates, loan.get(Loan.mortgage_lates, MortgageLatesType.No_mortgage_late))
              .set(Quote.non_qm_cash_reserved, loan.get(Loan.non_qm_cash_reserved, 6))
              .set(Quote.lock_period, loan.get(Loan.lock_period, 30))
              .set(Quote.credit_event, loan.get(Loan.credit_event, CreditEventStatus.None));
    }

    try {
      final CellData execute = isNonQM ? MosoPricingAPI.runNonQMPricing(data) : MosoPricingAPI.runPricing(data);
      return execute.get(QueryResult.rows, new ArrayList<>());
    } catch (Exception e) {
      e.printStackTrace();
    }
    return rates;
  }

  public static void ensureDisclosureDueTodayLabel(HasValues row) {
    if (Modules.modules.isEnableModule(DisclosureMod.NAME)) {
      ThreadContext.setClientTimeZone("America/Los_Angeles");
      Date today = Dates.dates.removeTime(new Date());
      if (row.hasValue(Loan.disclosure_due_date_tz) && row.get(Loan.disclosure_due_date_tz).equals(Dates.dates.getISOStringFromDate(today))) {
        row.set(Loan.disclosure_due_today, LoanMessages.loanMessages.disclosure_due_today_label());
      }
    }
  }

  public static String getDisclosureDueDate(String applicationDateTz) {
    return getDateWithoutFederalHolidayOp(applicationDateTz, 3);
  }

  public static String getDateWithoutFederalHolidayOp(String date, int daysToAdd) {
    ThreadContext.setClientTimeZone("America/Los_Angeles");
    final Bean federalHoliday = new Bundle().ensure(FederalHolidaysConfig.TYPE, FederalHolidaysConfig.DEFAULT_ID);

    final List<String> holidays = FederalHolidaysConfig.holidays.stream().filter(holiday -> Strings.isNotEmpty(federalHoliday.get(holiday))).map(federalHoliday::get).toList();
    final List<String> holidaysDate = formatDates(holidays);

    final Date applicationDate = Dates.dates.removeTime(Dates.dates.getDateFromISOString(date));

    final Calendar disclosureDueCalendar = Calendar.getInstance();
    disclosureDueCalendar.setTime(applicationDate);

    int additionalDays = 0;
    for (int i = 1; i <= daysToAdd; i++) {
      disclosureDueCalendar.add(Calendar.DAY_OF_MONTH, 1);

      if (disclosureDueCalendar.get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY) {
        additionalDays++;
      }

      final String disclosureDueDateStr = String.format("%02d/%02d", disclosureDueCalendar.get(Calendar.MONTH) + 1, disclosureDueCalendar.get(Calendar.DAY_OF_MONTH));
      if (holidaysDate.contains(disclosureDueDateStr)) {
        additionalDays++;
      }
    }
    disclosureDueCalendar.add(Calendar.DAY_OF_MONTH, additionalDays);
    return Dates.dates.getISOStringFromDate(disclosureDueCalendar.getTime());
  }

  private static List<String> formatDates(List<String> dates) {
    final List<String> formattedDates = new ArrayList<>();
    final SimpleDateFormat inputFormat = new SimpleDateFormat("M/d");
    final SimpleDateFormat outputFormat = new SimpleDateFormat("MM/dd");

    for (String date : dates) {
      if (date.contains(",")) {
        String[] split = date.split(",");
        for (String s : split) {
          formatted(s, inputFormat, outputFormat, formattedDates);
        }
      } else {
        formatted(date, inputFormat, outputFormat, formattedDates);
      }

    }
    return formattedDates;
  }

  private static void formatted(final String date, final SimpleDateFormat inputFormat, final SimpleDateFormat outputFormat, final List<String> formattedDates) {
    try {
      final Date parsedDate = inputFormat.parse(date);
      String formattedDate = outputFormat.format(parsedDate);
      formattedDates.add(formattedDate);
    } catch (ParseException e) {
      //Error with case not is date, ignore
    }
  }

  public static void setRealtorWorkWithBroker(Bundle bundle, CanBeStored<?> loan) {
    if (loan.hasValue(Loan.buyer_agent)
            && loan.load(Loan.buyer_agent).hasValue(email)
            && loan.hasValue(Loan.agent)) {
      try {
        Bean buyerAgent = bundle.get(PartnerAgent.TYPE, loan.load(Loan.buyer_agent).get(email));
        if (buyerAgent != null) {
          if (loan.is(Loan.agent, App.getCompanyInfo().get(Company.owner_key_name))) {
            buyerAgent.set(PartnerAgent.working_with_broker, true);
          } else {
            buyerAgent.set(PartnerAgent.working_with_broker, false);
          }
          buyerAgent.updateLabels();
          bundle.add(buyerAgent);
          bundle.commit();
        }
      } catch (Exception e) {
        e.printStackTrace();
      }
    }
  }

  public static void checkBorrowerSSNsHasSameLOSSN(Bundle bundle, Bean loan) {
    List<Bean> borrowers = loan.loadList(Loan.borrowers);
    String borrowerFullName = "";
    if (Colls.isNotEmpty(borrowers)) {
      for (Bean borrower : borrowers) {
        checkIfBorrowerHasSameLOSSN = borrower.hasValue(Borrower.ssn) && new Bundle().find(Admin.TYPE)
                .whereEquals(Admin.active, true)
                .whereEquals(Admin.ssn, borrower.get(Borrower.ssn))
                .exists();
        if (checkIfBorrowerHasSameLOSSN) {
          borrowerFullName = borrower.get(Admin.full_name);
          break;
        }
      }
    }
    loan.set(Loan.have_transactions_is_same_lo_ssn, checkIfBorrowerHasSameLOSSN);
    if (checkIfBorrowerHasSameLOSSN) {
      if (LoanUtils.isLoan(loan)) {
        LoanOps.createCondition(bundle, loan, conditionCodes.borrower_ssn_has_same_lo_ssn(), borrowerFullName);
      }
    }
  }


  /**
   * A lender's EPO policy may not cover every program it offers. The lender agreement records this as
   * {@link LenderAgreement#has_no_epo_policy} (no EPO at all) or {@link LenderAgreement#not_subject_for_epo}
   * plus the {@code *_types_epo} lists of programs that are exempt.
   */
  public static boolean isExemptedFromEPO(HasValues loan, HasValues lenderAgreement) {
    if (lenderAgreement == null) {
      return false;
    }
    if (lenderAgreement.is(LenderAgreement.has_no_epo_policy)) {
      return true;
    }
    if (lenderAgreement.isNot(LenderAgreement.not_subject_for_epo)) {
      return false;
    }
    return LoanUtils.loanHasValidLoanTypeAndProgram(loan,
            lenderAgreement.get(LenderAgreement.primary_loan_types_epo),
            // An empty sub-list means the lender exempted the whole program family, so pass null
            // ("primary match is enough") rather than an empty list, which would match nothing.
            emptyToNull(lenderAgreement.get(LenderAgreement.qm_loan_types_epo)),
            emptyToNull(lenderAgreement.get(LenderAgreement.non_qm_loan_types_epo)),
            emptyToNull(lenderAgreement.get(LenderAgreement.private_loan_types_epo)),
            null);
  }

  private static <T> List<T> emptyToNull(List<T> values) {
    return Colls.isEmpty(values) ? null : values;
  }

  public static void sendEmailEPO(HasValues newLoan, HasValues oldLoan) {
    Server.queueService(QueueType.EMAIL).addTask(
            EmailTemplateOp.class, JSON.make(EmailParams.template, "epo_detection")
                    .set("root", newLoan.key())
                    .set("lo_full_name_of_new_loan", newLoan.get(Loan.agent.dot(Admin.full_name)))
                    .set("lo_full_name_of_old_loan", oldLoan.get(Loan.agent.dot(Admin.full_name)))
                    .set("to", Collections.singletonList(oldLoan.get(Loan.agent.dot(Admin.company_email)))));
  }


  public static String getFaceBookAppID() {
    return Server.getSystemProperty(FacebookLead.FACEBOOK_APP_ID, "2844160349190580");
  }

  public static String getFaceBookAppSecret() {
    return Server.getSystemProperty(FacebookLead.FACEBOOK_APP_SECRET, "e5b420b9d30e77a697a1438e15a4dcbf");
  }

  public static String getFaceBookGraphVersion() {
    return Server.getSystemProperty(FacebookLead.FACEBOOK_GRAPH_API_VERSION_SETTING, "v14.0");
  }

  public static String getFaceBookLeadToken() {
    return Server.getSystemProperty(FacebookLead.FACEBOOK_LEAD_TOKEN, "DfcEX4igS65785thftPR8JfShm9skdg==");
  }

  public static String getFaceBookLeadKey() {
    return Server.getSystemProperty(FacebookLead.FACEBOOK_LEAD_KEY, "DfcEX4igSPR8JfShm9skdg==");
  }

  public static String getFaceBookPageAccessToken(String accessToken, String pageID) {
    Bundle bundle = new Bundle();
    bundle.disableSideEffect(true);
    bundle.disableEvents(true);
    try {
      return JSONUtil.parseObject(Server.httpService().get(
              FACEBOOK_GRAPH_URL + pageID +
                      "?fields=access_token" +
                      "&access_token=" + accessToken)).getRaw(FacebookLead.access_token.name());
    } catch (Exception ex) {
      logger.error("Failed to get Facebook page access token for page " + pageID
              + " (token likely expired/invalid)\n" + Arrays.toString(ex.getStackTrace()));
    }
    return null;
  }

  public static void createCondition(Bundle bundle, HasValues loan, String conditionCode) {
    createCondition(bundle, loan, conditionCode, null);
  }

  public static void createCondition(Bundle bundle, HasValues loan, String conditionCode, String borrowerName) {
    createCondition(bundle, loan, conditionCode, borrowerName, null);
  }

  public static void createCondition(Bundle bundle, HasValues loan, String conditionCode, String borrowerName, String description) {
    List<Bean> createdTodos = bundle.find(Condition.TYPE).whereEquals(Condition.loan_id, loan.id()).whereEquals(Condition.code, conditionCode).list();
    if (Colls.isNotEmpty(createdTodos)) {
      try {
        new DeleteTodoOp().execute(JSON.empty().set(HasKey.key.s(), createdTodos.stream().map(Bean::key).toList()));
      } catch (Exception e) {
        e.printStackTrace();
      }
    }
    ToDosFilter.Config config = ToDosFilter.get(conditionCode);
    if (conditionCode.equals(conditionCodes.borrower_ssn_has_same_lo_ssn())) {
      config.setDetail(conditionLabels.borrower_ssn_has_same_lo_ssn_desc(borrowerName, Server.getCompanyWithDBAInfo().get(Company.name)));
    }
    Server.queueService(QueueType.LOAN).addTask(SaveTodoOp.class, JSON.empty()
            .set(Condition.loan_id, loan.id())
            .set(Condition.code, conditionCode)
            .set(Condition.details, description != null ? description : config.getDetail())
            .set(Condition.owner_type, config.getConditionOwnerType())
            .set(Condition.require, config.isRequire())
            .set(Condition.cleared, false));
  }

  public static void createConditionHaveManyOwner(Bundle bundle, Bean loan, String code, String description, List<ConditionOwnerType> conditionType) {
    conditionType.forEach(type -> {
      List<Bean> createdTodos = bundle.find(Condition.TYPE).whereEquals(Condition.loan_id, loan.id()).whereEquals(Condition.code, code).whereEquals(Condition.owner_type, type).list();
      if (Colls.isNotEmpty(createdTodos)) {
        try {
          new DeleteTodoOp().execute(JSON.empty().set(HasKey.key.s(), createdTodos.stream().map(Bean::key).toList()));
        } catch (Exception e) {
          e.printStackTrace();
        }
      }
      try {
        Server.queueService().addTask(SaveTodoOp.class, JSON.empty()
                .set(Condition.loan_id, loan.id())
                .set(Condition.code, code)
                .set(Condition.details, description)
                .set(Condition.owner_type, type)
                .set(Condition.require, true)
                .set(Condition.cleared, false));
      } catch (Exception e) {
        e.printStackTrace();
      }
    });
  }

  public static FacebookAdStatus getFBAdStatus(String adID, String userAccessToken) {
    try {
      JSON result = JSONUtil.parseObject(Server.httpService().get(FACEBOOK_GRAPH_URL + LoanOps.getFaceBookGraphVersion()
              + "/" + adID + "?fields=id,name,effective_status,status&access_token=" + userAccessToken));
      String status = result.get("effective_status", StringType.instance());
      return FacebookAdStatus.getFBStatus(status);

    } catch (Exception e) {
      e.printStackTrace();
    }

    return null;
  }

  public static void createDefaultFollowUp(Bean loan) {
    if (LOAN_FACTORY.equals(Server.namespace()) && !LoanUtils.isLoan(loan)
            && loan.hasValue(Loan.agent) && !loan.hasValue(Loan.follow_up)
            && App.currentUser() != null) {
      Bean followUp = getFollowUpBean(loan);
      followUp.set(ToFollowUp.wakeup_date_tz, Dates.dates.getISOStringFromDate(new Date()));
      List<String> recipients = new ArrayList<>();
      recipients.add("$" + Loan.agent.name());
      if (loan.get(Loan.agent).equals("thuan@loanfactory.com") && loan.hasValue(Loan.originator_assistant)) {
        recipients.add("$" + Loan.originator_assistant.name());
      }
      followUp.set(ToFollowUp.recipient_fks, recipients);
      followUp.save();
      loan.set(Loan.follow_up, followUp.id()).set(Loan.wakeup_date_tz, followUp.get(ToFollowUp.wakeup_date_tz));
    }
  }

  public static void createDefaultFollowUpForLORecruiting(CanBeStored<?> recruiting) {
    if (LOAN_FACTORY.equals(Server.namespace()) && App.currentUser() != null
            && recruiting.is(LORecruiting.recruiting_type, LORecruiting.RecruitingType.interested)) {
      Bean followUp = getFollowUpBean(recruiting);
      followUp.set(ToFollowUp.wakeup_date_tz, Dates.dates.getISOStringFromDate(new Date()));
      List<String> recipients = new ArrayList<>();
      if (recruiting.hasValue(LORecruiting.recruiter)) {
        if (recruiting.hasValue(LORecruiting.onboarding_specialist)) {
          recipients.add("$" + LORecruiting.onboarding_specialist.name());
        } else {
          recipients = new ArrayList<>();
          // A program member's lead (recruiter is a Loan Officer, not a staff recruiter) gets no staff follow-up task.
          if (!LoRecruiterProgramStanding.holdsProgramMemberCredit(recruiting)) {
            recipients.add("$" + LORecruiting.recruiter.name());
          }
        }
      }
      followUp.set(ToFollowUp.recipient_fks, recipients)
              .set(ToFollowUp.note, loanMessages.note_default_follow_up_for_lo_recruiting())
              .save();
      recruiting.set(LORecruiting.follow_up, followUp.id())
              .set(LORecruiting.wakeup_date_tz, followUp.get(ToFollowUp.wakeup_date_tz));
    }
  }

  private static Bean getFollowUpBean(HasValues value) {
    Bean followUp = null;
    if (value.hasValue(HasFollowUp.follow_up)) {
      followUp = new Bundle().get(ToFollowUp.TYPE, value.get(HasFollowUp.follow_up));
    }
    if (followUp == null) {
      followUp = new Bundle().create(ToFollowUp.TYPE);
      followUp.set(ToFollowUp.container, value.key())
              .set(ToFollowUp.creator, App.currentUser().get(Admin.keyName))
              .set(ToFollowUp.creator_type, Admin.TYPE.name())
              .set(ToFollowUp.note, loanMessages.automatic_follow_up_note());
    }
    return followUp;
  }

  public static String getFBCampaignStatus(String campaignID, String userAccessToken) {
    try {
      JSON result = JSONUtil.parseObject(Server.httpService().get(FACEBOOK_GRAPH_URL + LoanOps.getFaceBookGraphVersion()
              + "/" + campaignID + "?fields=id,name,effective_status,status&access_token=" + userAccessToken));
      return result.get("effective_status", StringType.instance());
    } catch (Exception e) {
      e.printStackTrace();
    }

    return null;
  }

  public static String getIncompletenessDate(String applicationDate) {
    ThreadContext.setClientTimeZone("America/Los_Angeles");
    Date date = Dates.dates.getDateFromISOString(applicationDate);
    return Dates.dates.getISOStringFromDate(Dates.dates.addDays(Dates.dates.removeTime(date), 26));
  }

  public static void getAllFbData(String url, List<HasValues> listData) {
    try {
      JSON result = JSONUtil.parseObject(Server.httpService().get(url));
      List<HasValues> listAd = result.get("data", JsonObjectType.instance().listType());
      listData.addAll(listAd);
      HasValues paging = result.get("paging", JsonObjectType.instance());
      if (paging != null) {
        String nextPage = paging.get("next", StringType.instance());
        if (Strings.isNotEmpty(nextPage)) {
          getAllFbData(nextPage, listData);
        }
      }

    } catch (Exception e) {
      e.printStackTrace();
    }

  }

  public static void updateFacebookStatistic(Bundle bundle, boolean isIncrease, List<Field<Integer>> fields) {
    Bean fbStatistic = bundle.ensure(FacebookAdStatistic.TYPE, FacebookAdStatistic.DEFAULT_ID);
    for (Field<Integer> field : fields) {
      fbStatistic.increment(field, isIncrease ? 1 : -1);
    }
    fbStatistic.save();
  }

  /***
   * Send CTC Notice for Correspondent Loan, only for Loan Factory namespace
   * @param loan
   */
  public static void sendCTCNoticeCorrespondentLoan(HasValues loan) {
    App.onlyForNS(LOAN_FACTORY, () -> Server.queueService(QueueType.EMAIL).addTask(
            EmailTemplateOp.class, JSON.make(EmailParams.template, "ctc_notice_correspondent_loan")
                    .set("root", loan.key())));
  }

  public static void sendNotifyMarketplaceEventEmail(HasValues bean, boolean sendOutFor1Day) {
    if (bean.is(MarketplaceEvent.is_published) && bean.is(MarketplaceEvent.event_status, MarketplaceEventStatus.Approved) && (bean.hasValue(MarketplaceEvent.audiences) ||
            (bean.is(MarketplaceEvent.is_send_remind_to_guests) && Colls.isNotEmpty(bean.get(MarketplaceEvent.guests))))) {
      HasValues owner = bean.load(MarketplaceEvent.owner);
      if (bean.is(MarketplaceEvent.is_send_remind_to_guests)) {
        if (!sendOutFor1Day) {
          List<String> tos = bean.get(MarketplaceEvent.guests, new ArrayList<>());
          if (bean.hasValue(MarketplaceEvent.audiences)) {
            tos.addAll(bean.get(MarketplaceEvent.audiences).stream().map(a -> a.get(com.mvu.core.shared.entity.User.email)).toList());
          }
          try {
            new EmailTemplateOp().execute(
                    JSON.make(EmailParams.template, "special_event_notify_before_1_hour")
                            .set("root", bean.key())
                            .set("owner", owner)
                            .set(Template.bcc, tos));
            NotifyWhenMarketplaceEventUpcoming.notify(bean, "1 hour");
          } catch (Exception e) {
            e.printStackTrace();
          }
        }
      } else {
        bean.get(MarketplaceEvent.audiences, new ArrayList<>()).forEach(audience -> {
          Server.queueService(QueueType.EMAIL).addTask(EmailTemplateOp.class,
                  JSON.make(EmailParams.template, sendOutFor1Day ? "event_notify_before_1_day" : "event_notify_before_1_hour").set("root", bean.key())
                          .set("owner", owner)
                          .set("to", Collections.singletonList(audience.get(com.mvu.core.shared.entity.User.email)))
                          .set("audience", audience)
                          .set("from", owner.get(com.mvu.core.shared.entity.Admin.company_email, owner.get(com.mvu.core.shared.entity.Admin.email))),
                  0);
        });
        NotifyWhenMarketplaceEventUpcoming.notify(bean, sendOutFor1Day ? "1 day" : "1 hour");
      }
    }

  }

  public static void clientAppliedTransaction(Bundle bundle, String email) {
    if (Strings.isNotEmpty(email)) {
      Bean client = bundle.find(Client.TYPE).whereEquals(Client.email, email).first();
      if (client != null && client.isNot(Client.applied_transaction)) {
        client.set(Client.applied_transaction, true).save();
      }
    }
  }

  public static void checkDisclosureWhenBorrowersChanged(HasValues loan, List<HasValues> oldBorrowers, List<Bean> newBorrowers, Consumer<HasValues> action) {
    if (Modules.modules.isEnableModule(DisclosureMod.NAME) && loan.isNot(Loan.loan_type, LoanType.private_loan) && loan.is(Loan.is_completed_application)) {
      List<List<String>> oldBorrowerKeys = new BorrowersRelationship(oldBorrowers).jointCouples(Borrower.key);
      List<List<String>> newBorrowerKeys = new BorrowersRelationship(newBorrowers).jointCouples(Borrower.key);
      // BorrowersRelationship group borrowers by position, so 2 lists always have the same order, could compare directly
      if (!oldBorrowerKeys.equals(newBorrowerKeys)) {
        action.accept(loan);
      }
    }
  }

  /**
   * When borrower email changes (without structural change like add/remove/join), resend e-sign links.
   * Built-in: resend invite emails (picks up new email from borrower bean).
   * Inkless: cancel old envelopes and re-send with new email via InklessSendDisclosureOp.
   */
  public static void checkDisclosureWhenBorrowerEmailChanged(HasValues loan, List<HasValues> oldBorrowers, List<Bean> newBorrowers) {
    if (!Modules.modules.isEnableModule(DisclosureMod.NAME) || loan.is(Loan.loan_type, LoanType.private_loan) || loan.isNot(Loan.is_completed_application)) {
      return;
    }
    // Only check email changes when borrower structure hasn't changed (structural changes are handled by checkDisclosureWhenBorrowersChanged)
    List<List<String>> oldBorrowerKeys = new BorrowersRelationship(oldBorrowers).jointCouples(Borrower.key);
    List<List<String>> newBorrowerKeys = new BorrowersRelationship(newBorrowers).jointCouples(Borrower.key);
    if (!oldBorrowerKeys.equals(newBorrowerKeys)) {
      return; // structural change — handled by checkDisclosureWhenBorrowersChanged
    }

    // Collect borrower keys whose email changed
    Map<String, String> oldEmails = new HashMap<>();
    for (HasValues b : oldBorrowers) {
      oldEmails.put(b.key(), b.get(Borrower.email));
    }

    List<String> changedBorrowerKeys = new ArrayList<>();
    for (Bean b : newBorrowers) {
      String oldEmail = oldEmails.get(b.key());
      if (oldEmail != null && !oldEmail.equals(b.get(Borrower.email))) {
        changedBorrowerKeys.add(b.key());
      }
    }

    if (!changedBorrowerKeys.isEmpty() && LoanUtils.isLoan(loan) && loan.is(Loan.send_disclosure_with_package_of_state)) {
      Server.queueService(QueueType.LOAN).addTask(RequestBorrowerCompleteEsignOp.class,
              JSON.make(Loan.id, loan.id())
                      .set(SigningSession.is_email_changed, true)
                      .set(Borrower.key.s(), changedBorrowerKeys), 10000);
    }
  }

  public static void sendEmailToRevieweeManager(CanBeStored<?> bean) {
    if (Company.LOAN_FACTORY.equals(Server.namespace())) {
      HasValues reviewee = new Bundle().get(Admin.TYPE, bean.get(ReviewColleagues.reviewee));
      HasValues revieweeManager = reviewee != null ? reviewee.load(Admin.manager) : null;
      if (revieweeManager != null) {
        Server.queueService(QueueType.EMAIL).addTask(EmailTemplateOp.class,
                JSON.make(EmailParams.template, "associate_review/new_associate_review")
                        .set("reviewee_name", reviewee.get(Admin.full_name))
                        .set("reviewee_company_email", reviewee.get(Admin.company_email))
                        .set("rate", String.valueOf(bean.get(ReviewColleagues.rate, 0)))
                        .set("manager", revieweeManager));
      }
    }
  }

  public static void createAutomaticFollowUpWhenLOAChangeWasChanged(CanBeStored<?> loan) {
    boolean previousLOAExists = loan.getOldValues().hasValue(Loan.originator_assistant);
    boolean isChangeLOA = loan.hasValue(Loan.originator_assistant) && loan.isChanged(Loan.originator_assistant);
    if (previousLOAExists && isChangeLOA && loan.hasValue(Loan.setup_specialist)) {
      Bean followUp = getFollowUpBean(loan);
      Date twoHoursFromNow = Dates.dates.addHours(new Date(), 2);
      followUp.set(ToFollowUp.wakeup_date_tz, Dates.dates.getISOStringFromDate(twoHoursFromNow))
              .set(ToFollowUp.send_email, true)
              .set(ToFollowUp.recipient_fks, Collections.singletonList("$" + Loan.setup_specialist.name()))
              .set(ToFollowUp.note, loanMessages.follow_note_when_loa_was_changed())
              .save();
      loan.set(Loan.follow_up, followUp.id())
              .set(Loan.wakeup_date_tz, followUp.get(ToFollowUp.wakeup_date_tz));
    }
  }

  public static SessionUser demandRateAndQuotePermission(String msg) {
    SessionUser sessionUser = ThreadContext.demandUser();
    if (!sessionUser.hasPermission(LoanPermissions.EDIT_RATE_QUOTE)) {
      throw new ErrorMessage(msg);
    }
    return sessionUser;
  }

  public static void sendNotifyHomeLoanEmail(Bean loan) {
    if (!Server.isTest() && (loan.is(Loan.purpose, PurposeType.PM) || loan.is(Loan.state, "MI")) && Modules.modules.isEnableModule(DisclosureMod.NAME)) {
      Server.queueService(QueueType.EMAIL).addTask(EmailTemplateOp.class,
              JSON.make(EmailParams.template, "notify_home_loan_toolkit").set("root", loan.key()));
    }
  }

  public static void updateLargeEntity(Bundle bundle,
                                       QueryBuilder<Bean> query,
                                       String startCursor,
                                       Action<Bean> action) {
    updateLargeEntity(bundle, query, startCursor, action, null);
  }

  public static void updateLargeEntity(Bundle bundle,
                                       QueryBuilder<Bean> query,
                                       String startCursor,
                                       Action<Bean> action,
                                       Predicate<Bean> stopCondition) {
    do {
      bundle.clear();
      System.out.println("-------------------------------------------------------------");
      System.out.println("Updating from: " + (startCursor == null ? "Start" : startCursor));
      System.out.println("-------------------------------------------------------------");
      Tuple2<String, List<Bean>> tuple = query.getChunk(50, startCursor);
      List<Bean> items = tuple.getValue();
      if (items.isEmpty()) {
        startCursor = null;
      } else {
        startCursor = tuple.getKey();
        boolean shouldContinue = true;

        for (Bean item : items) {
          if (stopCondition != null && stopCondition.test(item)) {
            shouldContinue = false;
            break;
          }

          action.execute(item);
          if (item.isChanged()) {
            bundle.add(item);
          }
        }

        bundle.commit();
        if (bundle.disableSideEffect()) {
          Server.cache().deleteAll(bundle.getBeans().stream()
                  .filter(bean -> bean.type().cached())
                  .map(HasKey.key)
                  .filter(Strings::isNotEmpty)
                  .toList());
        }
        bundle.clear();

        if (!shouldContinue) {
          startCursor = null;
        }
      }
    } while (Strings.isNotEmpty(startCursor));
  }

  private static final GenerateDocType documentType = GenerateDocType.Interest_Rate_Lock_Agreement;
  public static final Field<String> wa_rate_lock_agreement = new Field<>("wa_rate_lock_agreement", StringType.instance());

  public static void sendWARateLockAgreement(Bundle bundle, HasValues loan) throws Exception {
    if (loan.is(Loan.state, "WA") && !loan.hasValue(Loan.wa_rate_lock_agreement_file) && loan.isNot(Loan.referral_loan)) {
      String templateName = documentType.getTemplateName();
      DocumentUtils.automaticallyGenerateDoc(
              JSON.empty().set(HasKey.key, templateName)
                      .set(Loan.id, loan.id())
                      .set(SigningSession.sent_out_for_signing, true));

      // Notify signing session if it exists
      Bean signingSession = bundle.find(SigningSession.TYPE)
              .whereEquals(SigningSession.document, templateName)
              .whereEquals(SigningSession.loan_id, loan.id())
              .first();
      if (signingSession != null) {
        Server.queueService(QueueType.EMAIL)
                .addTask(NotifySigningDocumentOp.class,
                        JSON.empty().set(SigningSession.keyName, signingSession.keyName()));
      }
    }
  }

  public static List<HasValues> getLoanFee(HasValues loan) throws Exception {
    CellData loanFee = new FindLoanFeesOp().execute(JSON.empty().set(LoanFee.loan_id, loan.id()));
    return loanFee.getRows();
  }

  public static void reconcileOwnershipRecords(HasValues input, List<? extends HasValues> borrowers) {
    List<String> activeSsns = borrowers.stream()
            .flatMap(b -> Stream.of(b.get(Borrower.ssn), b.get(Borrower.temporary_ssn)))
            .filter(Strings::isNotEmpty)
            .toList();
    if (activeSsns.isEmpty()) {
      // No borrower SSN to compare with (blank SSN posted by the 1003): every record would look orphaned and be deleted.
      return;
    }

    for (Field<List<HasValues>> field : Colls.asList(Loan.assets, Loan.liabilities, Loan.real_estates)) {
      if (input.hasValue(field)) {
        List<HasValues> reconciled = input.get(field).stream()
                .filter(record -> {
                  List<String> ssns = record.get(HasSsns.ssns);
                  if (Colls.isEmpty(ssns)) {
                    return true;
                  }
                  return ssns.stream().anyMatch(activeSsns::contains);
                })
                .map(record -> {
                  List<String> ssns = record.get(HasSsns.ssns);
                  if (Colls.isEmpty(ssns)) {
                    return record;
                  }
                  List<String> retained = ssns.stream().filter(activeSsns::contains).collect(Collectors.toList());
                  String names = Strings.combineNames(
                          borrowers.stream()
                                  .filter(b -> retained.contains(b.get(Borrower.ssn)) || retained.contains(b.get(Borrower.temporary_ssn)))
                                  .map(b -> b.get(Borrower.full_name))
                                  .filter(Strings::isNotEmpty)
                                  .collect(Collectors.toList())
                  );
                  return record.set(HasSsns.ssns, retained)
                          .set(HasNames.names, names);
                })
                .collect(Collectors.toList());
        input.set(field, reconciled);
      }
    }
  }

}