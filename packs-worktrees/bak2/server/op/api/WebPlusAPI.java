package com.mvu.loan.server.op.api;

import javax.servlet.http.HttpServletRequest;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.logging.Logger;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.google.api.server.spi.ServiceException;
import com.google.api.server.spi.config.Api;
import com.google.api.server.spi.config.ApiMethod;
import com.google.api.server.spi.config.Named;
import com.google.api.server.spi.response.BadRequestException;
import com.google.api.server.spi.response.NotFoundException;
import com.google.appengine.api.NS;
import com.google.api.server.spi.response.UnauthorizedException;
import com.loanfactory.integration.pylon.PylonClient;
import com.loanfactory.integration.pylon.PylonTaskService;
import com.loanfactory.integration.pylon.PylonTaskService.BorrowerTaskGroup;
import com.loanfactory.integration.pylon.PylonTaskService.LoanTasks;
import com.loanfactory.integration.pylon.PylonVerificationService;
import com.mvu.appengine.db.Bean;
import com.mvu.appengine.db.Bundle;
import com.mvu.appengine.server.dynamiclink.DynamicLinkCreator;
import com.mvu.appengine.server.op.CompanyInfoOp;
import com.mvu.appengine.server.op.DeleteOp;
import com.mvu.appengine.server.op.EmailTemplateOp;
import com.mvu.appengine.server.op.ExportOp;
import com.mvu.appengine.server.op.FindOp;
import com.mvu.appengine.server.op.FindSuggestionsOp;
import com.mvu.appengine.server.op.GetOp;
import com.mvu.appengine.server.op.GetTemplateContentOp;
import com.mvu.appengine.server.op.GetTemplateOp;
import com.mvu.appengine.server.op.GetUploadUrlOp;
import com.mvu.appengine.server.op.InternalReviewStatisticOp;
import com.mvu.appengine.server.op.RegisterClientOp;
import com.mvu.appengine.server.op.SaveOp;
import com.mvu.appengine.server.op.SendSMSOp;
import com.mvu.appengine.server.op.ShortenUrlWithFirebaseOp;
import com.mvu.appengine.server.op.SubscribeOp;
import com.mvu.appengine.server.op.chat.CheckChatAvailableOp;
import com.mvu.appengine.server.op.chat.SaveCustomerRequestOp;
import com.mvu.appengine.server.op.openfire.OpenfireService;
import com.mvu.appengine.server.op.template.PreviewTemplateOp;
import com.mvu.appengine.server.op.user.CheckAvailableProfileWithCredentialOp;
import com.mvu.appengine.server.op.user.GetUserProfilesListOp;
import com.mvu.appengine.server.op.user.SendEmailOTPOp;
import com.mvu.appengine.server.op.user.VerifyEmailOTPOp;
import com.mvu.core.client.resource.States;
import com.mvu.core.server.CellData;
import com.mvu.core.server.JSON;
import com.mvu.core.server.QueryBuilder;
import com.mvu.core.server.Server;
import com.mvu.core.server.ThreadContext;
import com.mvu.core.server.op.AbstractOp;
import com.mvu.core.server.op.EmailOp;
import com.mvu.core.server.op.OpRegistry;
import com.mvu.core.shared.App;
import com.mvu.core.shared.typekey.Permission;
import com.mvu.core.shared.ErrorMessage;
import com.mvu.core.shared.FileParams;
import com.mvu.core.shared.Format;
import com.mvu.core.shared.HasValues;
import com.mvu.core.shared.QueryResult;
import com.mvu.core.shared.SharedConstants;
import com.mvu.core.shared.Type;
import com.mvu.core.shared.datatype.BooleanType;
import com.mvu.core.shared.datatype.IntegerType;
import com.mvu.core.shared.datatype.JsonObjectType;
import com.mvu.core.shared.datatype.LanguageLibrary;
import com.mvu.core.shared.datatype.LongType;
import com.mvu.core.shared.datatype.StringType;
import com.mvu.core.shared.entity.AddDomainRequest;
import com.mvu.core.shared.entity.Address;
import com.mvu.core.shared.entity.Article;
import com.mvu.core.shared.entity.AuthenticationHistory;
import com.mvu.core.shared.entity.CityUS;
import com.mvu.core.shared.entity.Configuration;
import com.mvu.core.shared.entity.CountyUS;
import com.mvu.core.shared.entity.FacebookConfiguration;
import com.mvu.core.shared.entity.HasBranch;
import com.mvu.core.shared.entity.HasEmail;
import com.mvu.core.shared.entity.HasId;
import com.mvu.core.shared.entity.HasKey;
import com.mvu.core.shared.entity.HasKeyName;
import com.mvu.core.shared.entity.HasLabels;
import com.mvu.core.shared.entity.HasName;
import com.mvu.core.shared.entity.HasOTP;
import com.mvu.core.shared.entity.HasPhone;
import com.mvu.core.shared.entity.InternalReview;
import com.mvu.core.shared.entity.OptOutRequest;
import com.mvu.core.shared.entity.Reaction;
import com.mvu.core.shared.entity.Template;
import com.mvu.core.shared.entity.User;
import com.mvu.core.shared.entity.ZipCode;
import com.mvu.core.shared.field.FK;
import com.mvu.core.shared.field.Field;
import com.mvu.core.shared.params.EmailParams;
import com.mvu.core.shared.params.FormParams;
import com.mvu.core.shared.params.TableParams;
import com.mvu.core.shared.typekey.CompareType;
import com.mvu.core.shared.typekey.ReviewSource;
import com.mvu.core.shared.util.Colls;
import com.mvu.core.shared.util.Dates;
import com.mvu.core.shared.util.Modules;
import com.mvu.core.shared.util.Strings;
import com.mvu.core.shared.util.Tuple2;
import com.mvu.gapi.server.op.GetFilesOp;
import com.mvu.loan.client.QuoteSection;
import com.mvu.loan.server.AdminPages;
import com.mvu.loan.server.op.AgentArticleCategories;
import com.mvu.loan.server.op.CountyAndCityHasLoanOfficer;
import com.mvu.loan.server.op.FindLoanOfficerOp;
import com.mvu.loan.server.op.FindVendorContactsOp;
import com.mvu.loan.server.op.GenerateClosingCostsFeeOps;
import com.mvu.loan.server.op.GeneratePaymentOp;
import com.mvu.loan.server.op.GetCompanyBranchesWithGoogleReviews;
import com.mvu.loan.server.op.GetCompanyLicensesOp;
import com.mvu.loan.server.op.GetCompanyLoanStatistic;
import com.mvu.loan.server.op.GetCountyLimits;
import com.mvu.loan.server.op.GetLendersLicensedInStateOp;
import com.mvu.loan.server.op.GetLicenseInfoByState;
import com.mvu.loan.server.op.GetMCRHistoriesOp;
import com.mvu.loan.server.op.GetMonthlyMortgageInsuranceOp;
import com.mvu.loan.server.op.GetNextWebinarsOp;
import com.mvu.loan.server.op.GetNumberTicketsRushAdminOp;
import com.mvu.loan.server.op.GetQuoteConfigWithAliases;
import com.mvu.loan.server.op.GetStateTax;
import com.mvu.loan.server.op.GetYoutubeEmbedHTMLOp;
import com.mvu.loan.server.op.LoanOfficerCountOp;
import com.mvu.loan.server.op.MortgageCalculatorOp;
import com.mvu.loan.server.op.MosoPricingAPI;
import com.mvu.loan.server.op.RunPylonPricingOp;
import com.mvu.loan.server.op.SaveMCRHistoryOp;
import com.mvu.loan.server.op.admin.DetectEmployeeSSNsOp;
import com.mvu.loan.server.op.admin.EnsureSigningSessionsHRDocumentLoanOfficer;
import com.mvu.loan.server.op.admin.ListAdminsFromCachedOp;
import com.mvu.loan.server.op.admin.RefreshLoanCoordinatorCache;
import com.mvu.loan.server.op.agent.AgentReviewsSummaryOp;
import com.mvu.loan.server.op.lender.FindLenderContactsOp;
import com.mvu.loan.server.op.lender.FindLenderDPAProgramsOp;
import com.mvu.loan.server.op.loan.DeleteOptOutRequestOp;
import com.mvu.loan.server.op.loan.DetectCensusTractForPurchaseLoanOp;
import com.mvu.loan.server.op.loan.ExportCommissionCheckOp;
import com.mvu.loan.server.op.loan.LoanOps;
import com.mvu.loan.server.op.loan.SaveLeadConsumersOp;
import com.mvu.loan.server.op.loan.SaveLeadFunnelOp;
import com.mvu.loan.server.op.loan.SaveLeadOp;
import com.mvu.loan.server.op.loan.UpdateAlertOp;
import com.mvu.loan.server.op.marketing.UpdateMarketingCampaignVisitOp;
import com.mvu.loan.server.op.meeting.InterestedLoanOfficerPaidStartupFee;
import com.mvu.loan.server.op.partner_agent.TotalActiveRealtorCountOp;
import com.mvu.loan.server.op.pylon.SyncPylonAssetOp;
import com.mvu.loan.server.op.pylon.SyncPylonIncomeOp;
import com.mvu.loan.server.op.rate.FindTodayRateOp;
import com.mvu.loan.server.op.rate.GetRateDataToGeneratePDFOp;
import com.mvu.loan.server.op.rate.RateTableRates;
import com.mvu.loan.server.op.recruiting.EnsureSigningSessionsRegisterInterestedLoanOfficer;
import com.mvu.loan.server.op.recruiting.LeadOriginStamp;
import com.mvu.loan.server.op.recruiting.MortgageWebsiteDisclosure;
import com.mvu.loan.server.op.recruiting.RegisterInterestedLoanOfficer;
import com.mvu.loan.server.op.referral.SaveLORecruiterOp;
import com.mvu.loan.server.op.referral.SaveReferralTrackingOp;
import com.mvu.loan.server.op.review.ReviewSummaryOp;
import com.mvu.loan.server.op.subscription.ClientRegisterSubscriptionListOp;
import com.mvu.loan.server.op.user.ExportAdminByLoanOfficerOp;
import com.mvu.loan.server.op.user.ExportAdminOps;
import com.mvu.loan.server.op.user.SendMessageToAdminOp;
import com.mvu.loan.shared.LoanQuoteUtils;
import com.mvu.loan.shared.LoanUtils;
import com.mvu.loan.shared.QualificationUtil;
import com.mvu.loan.server.op.techadvisor.DeleteTechAppFeatureOp;
import com.mvu.loan.server.op.techadvisor.DeleteTechAppOp;
import com.mvu.loan.server.op.techadvisor.GetTechAppRegistryOp;
import com.mvu.loan.server.op.techadvisor.RegisterTechAdvisorOp;
import com.mvu.loan.server.op.techadvisor.SaveTechAdvisorConfigOp;
import com.mvu.loan.server.op.techadvisor.SaveTechAppOp;
import com.mvu.loan.shared.entity.TechAdvisorRegistration;
import com.mvu.loan.shared.entity.TechApp;
import com.mvu.loan.shared.entity.TechAppFeature;
import com.mvu.loan.shared.entity.Admin;
import com.mvu.loan.shared.entity.AgentReview;
import com.mvu.loan.shared.entity.AgentReviewConfig;
import com.mvu.loan.shared.entity.AppreciationSetting;
import com.mvu.loan.shared.entity.BestRateChartRecord;
import com.mvu.loan.shared.entity.BestRateCompare;
import com.mvu.loan.shared.entity.BestRateRecord;
import com.mvu.loan.shared.entity.Borrower;
import com.mvu.loan.shared.entity.Branch;
import com.mvu.loan.shared.entity.CRMBestRateHistory;
import com.mvu.loan.shared.entity.CRMSubscriptionContact;
import com.mvu.loan.shared.entity.CRMSubscriptionContent;
import com.mvu.loan.shared.entity.CRMSubscriptionType;
import com.mvu.loan.shared.entity.Campaign;
import com.mvu.loan.shared.entity.CampaignApplicant;
import com.mvu.loan.shared.entity.Client;
import com.mvu.loan.shared.entity.Company;
import com.mvu.loan.shared.entity.CorporateDiscountConfiguration;
import com.mvu.loan.shared.entity.CustomerRequest;
import com.mvu.loan.shared.entity.DepartmentSetting;
import com.mvu.loan.shared.entity.Employment;
import com.mvu.loan.shared.entity.EscalationTicket;
import com.mvu.loan.shared.entity.EscalationTicketPriority;
import com.mvu.loan.shared.entity.EscalationTicketStatus;
import com.mvu.loan.shared.entity.HasSubscriptionConfigParams;
import com.mvu.loan.shared.entity.LFCorporateDiscountProgram;
import com.mvu.loan.shared.entity.LORecruiting;
import com.mvu.loan.shared.entity.LeaderboardEntry;
import com.mvu.loan.shared.entity.Lender;
import com.mvu.loan.shared.entity.LenderAgreement;
import com.mvu.loan.shared.entity.LenderContact;
import com.mvu.loan.shared.entity.License;
import com.mvu.loan.shared.entity.LicenseInfo;
import com.mvu.loan.shared.entity.Loan;
import com.mvu.loan.shared.entity.LoanConfiguration;
import com.mvu.loan.shared.entity.MCRHistory;
import com.mvu.loan.shared.entity.MCRSetting;
import com.mvu.loan.shared.entity.MarketingMaterials;
import com.mvu.loan.shared.entity.MaxDTISetting;
import com.mvu.loan.shared.entity.MediaType;
import com.mvu.loan.shared.entity.MeetingAndAppointmentConfiguration;
import com.mvu.loan.shared.entity.NmlsSponsorReport;
import com.mvu.loan.shared.entity.NonLicenseSetting;
import com.mvu.loan.shared.entity.OpenIDSSOConfig;
import com.mvu.loan.shared.entity.PartnerAgent;
import com.mvu.loan.shared.entity.PylonEmployment;
import com.mvu.loan.shared.entity.PylonLoanTaskItem;
import com.mvu.loan.shared.entity.PylonTodoLink;
import com.mvu.loan.shared.entity.Qualification;
import com.mvu.loan.shared.entity.Quote;
import com.mvu.loan.shared.entity.QuoteConfiguration;
import com.mvu.loan.shared.entity.ReferralTracking;
import com.mvu.loan.shared.entity.ReferrerInvitationInfo;
import com.mvu.loan.shared.entity.Review;
import com.mvu.loan.shared.entity.ReviewColleagues;
import com.mvu.loan.shared.entity.ReviewConfig;
import com.mvu.loan.shared.entity.SubscriptionConfig;
import com.mvu.loan.shared.entity.Team;
import com.mvu.loan.shared.entity.Webinar;
import com.mvu.loan.shared.entity.WebinarType;
import com.mvu.loan.shared.referral_agent.ReferralAgentStatus;
import com.mvu.loan.shared.typekey.LoanOfficerReferredSource;
import com.mvu.loan.shared.typekey.RealtorSpecialtyType;
import com.mvu.quote.shared.entity.LoanProgram;
import com.mvu.quote.shared.entity.ParseRateInfo;
import com.mvu.quote.shared.entity.Rate;
import com.mvu.quote.shared.entity.RateTable;
import com.mvu.quote.shared.typekey.LenderType;
import com.mvu.quote.shared.typekey.LoanType;
import com.mvu.quote.shared.typekey.ProgramFilterGroup;
import com.mvu.quote.shared.typekey.PropertyType;
import com.mvu.quote.shared.typekey.PurposeType;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import org.apache.commons.lang3.StringUtils;

import static com.mvu.loan.client.quote.QuoteResult.BEST_LENDER;
import static com.mvu.loan.server.op.loan.LoanOps.getRecruiters;
import static com.mvu.loan.shared.entity.BestRateRecord.NO_HISTORY;

@Api(name = "webplus", version = "v1")
public class WebPlusAPI extends AbstractAPI {
  private static final String LOGOUT_PREFIX = "borrower_portal_logout_";

  private static final Logger LOG = Logger.getLogger(WebPlusAPI.class.getName());

  private static final List<String> QM_PROGRAM_KEYS = List.of("primary", "second_home", "investment", "fha", "va");
  private static final List<String> NON_QM_PROGRAM_KEYS = List.of("no_employment", "bank_statement", "dscr_investment", "foreign_national");

  /**
   * Tags for log-grepping the verify-link Plaid + Truv flows. Each handler
   * (token / exchange / sync) writes one line so we can follow a single
   * borrower's verification attempt across all three steps.
   */
  private static final String LOG_TAG_PLAID = "[PYLON-PLAID-SYNC]";
  private static final String LOG_TAG_TRUV = "[PYLON-TRUV-SYNC]";
  private static final String LOG_TAG_VERIFY = "[PYLON-VERIFY-LINK]";

  @Override
  protected String platform() {
    return "web-plus";
  }

  /**
   * Hard rule for this anonymous API: the associate SSN (HasAssociateSsn.ssn, stored as "SSN") never
   * leaves the server, whatever endpoint or generic op produced the response. Every JSON result is
   * walked, CellData rows and nested maps included, and a Bean whose type carries the property, at
   * the top level or embedded, is unwrapped to its toMap first. getLOInfo returns a toMap anyway so
   * the public shape is the profile, not a record dump.
   */
  @Override
  @SuppressWarnings("unchecked")
  protected <T> T handleRequest(final JSON input, final APIFunction<T> function) throws ServiceException {
    return super.handleRequest(input, in -> (T) withoutAssociateSsn(function.apply(in)));
  }

  @Override
  @SuppressWarnings("unchecked")
  protected <T> T handleRequest(final JSON input, final APIFunction<T> function, final Function<Exception, T> exceptionHandler) {
    return super.handleRequest(input, in -> (T) withoutAssociateSsn(function.apply(in)), exceptionHandler);
  }

  /**
   * A raw Bean is serialised by Endpoints through its getters (entity, properties, fullOldValues), every
   * stored property included. Anonymous routes hand out the same view an anonymous GetOp read gets: only
   * the fields flagged public, with no Borrower record expanded into it.
   */
  private static JSON anonymousView(final Bean bean, final Type type) {
    return bean == null ? null : (JSON) AnonymousBorrowerGuard.withoutBorrowerRecords(bean.toMap(FindOp.getView(JSON.empty(), type)));
  }

  /**
   * Removes the associate "SSN" property everywhere in a response. A Bean whose type carries that
   * property (Admin, BlackListUser, WebinarAttendee), at the top level or embedded, becomes its
   * toMap first; other Beans keep their shape.
   */
  static Object withoutAssociateSsn(final Object value) {
    return strip(value, Admin.ssn.name()::equals, WebPlusAPI::unwrapAssociateRecord);
  }

  /**
   * For results an anonymous caller obtains through the generic op door: a Bean of any type with an
   * SSN-named field becomes its toMap and no key naming any SSN field survives (ssn, ssns,
   * temporary_ssn, SSN), whatever kind the op read. Beans of other types keep the shape their
   * consumers see today.
   */
  static Object withoutAnySsn(final Object value) {
    return strip(value, key -> key.toLowerCase().contains("ssn"), WebPlusAPI::unwrapSsnCarrier);
  }

  /**
   * Walks JSON results, nested maps and lists. Records are unwrapped before descending so the
   * serialiser never sees a raw Bean (a "$fk" whole-record column loads one, and some ops return
   * one); label lists lose SSN tokens; a value is only written back when it changed, so
   * unmodifiable lists of plain values pass untouched.
   */
  @SuppressWarnings("unchecked")
  private static Object strip(final Object value, final Predicate<String> sensitive, final Function<Object, Object> unwrap) {
    final Object target = unwrap.apply(value);
    if (target instanceof JSON json) {
      for (String key : new ArrayList<>(json.keySet())) {
        if (sensitive.test(key)) {
          json.remove(key);
        } else {
          final Object child = json.getRaw(key);
          final Object stripped = stripChild(key, child, sensitive, unwrap);
          if (stripped != child) {
            json.getMap().put(key, stripped);
          }
        }
      }
    } else if (target instanceof Map<?, ?> map) {
      final Map<Object, Object> entries = (Map<Object, Object>) map;
      for (Object key : new ArrayList<>(entries.keySet())) {
        if (key instanceof String name && sensitive.test(name)) {
          entries.remove(key);
        } else {
          final Object child = entries.get(key);
          final Object stripped = stripChild(String.valueOf(key), child, sensitive, unwrap);
          if (stripped != child) {
            entries.put(key, stripped);
          }
        }
      }
    } else if (target instanceof List<?> list) {
      return strippedList((List<Object>) list, sensitive, unwrap);
    } else if (target instanceof Iterable<?> items) {
      final List<Object> copy = new ArrayList<>();
      boolean changed = false;
      for (Object item : items) {
        final Object stripped = strip(item, sensitive, unwrap);
        changed |= stripped != item;
        copy.add(stripped);
      }
      return changed ? copy : target;
    }
    return target;
  }

  /** Rewrites changed items in place; an unmodifiable list holding a changed item is replaced by a copy. */
  private static Object strippedList(final List<Object> items, final Predicate<String> sensitive, final Function<Object, Object> unwrap) {
    List<Object> result = items;
    for (int i = 0; i < items.size(); i++) {
      final Object item = items.get(i);
      final Object stripped = strip(item, sensitive, unwrap);
      if (stripped == item) {
        continue;
      }
      if (result == items) {
        try {
          items.set(i, stripped);
          continue;
        } catch (UnsupportedOperationException e) {
          result = new ArrayList<>(items);
        }
      }
      result.set(i, stripped);
    }
    return result;
  }

  private static Object stripChild(final String key, final Object child, final Predicate<String> sensitive, final Function<Object, Object> unwrap) {
    return HasLabels.labels.name().equals(key) ? withoutSsnLabels(child) : strip(child, sensitive, unwrap);
  }

  private static Object unwrapAssociateRecord(final Object value) {
    return value instanceof Bean bean && bean.type() != null && bean.type().hasField(Admin.ssn.name()) ? bean.toMap() : value;
  }

  private static Object unwrapSsnCarrier(final Object value) {
    if (value instanceof Bean bean && bean.type() != null) {
      for (Object field : bean.type().fields()) {
        if (((Field<?>) field).name().toLowerCase().contains("ssn")) {
          return bean.toMap();
        }
      }
    }
    return value;
  }

  private static final Pattern SSN_TOKEN = Pattern.compile("\\d{3}-?\\d{2}-?\\d{4}");

  /**
   * A label list, or the single matched label a suggestion row carries, loses "_SSN:value" entries
   * and tokens shaped like an SSN with or without dashes (BlackListUser indexes both).
   */
  private static Object withoutSsnLabels(final Object labels) {
    if (labels instanceof String label) {
      return isSsnLabel(label) ? null : labels;
    }
    if (!(labels instanceof List<?> list)) {
      return labels;
    }
    final List<Object> kept = new ArrayList<>();
    for (Object label : list) {
      if (!isSsnLabel(String.valueOf(label))) {
        kept.add(label);
      }
    }
    return kept.size() == list.size() ? labels : kept;
  }

  /**
   * A lender agreement is public unless explicitly hidden. {@code HasValues.is()} treats a missing
   * value as false, which hid every agreement saved before the field existed.
   */
  static boolean isShownOnPublicSite(HasValues lenderAgreement) {
    return !Boolean.FALSE.equals(lenderAgreement.get(LenderAgreement.show_on_public_site));
  }

  /**
   * Public listing needs an approved agreement that is not explicitly hidden. An absent agreement
   * has no is_approved, so it is never listed (visible-by-default must not widen to unapproved or
   * non-existent agreements).
   */
  static boolean isPubliclyListed(HasValues lenderAgreement) {
    return lenderAgreement.is(LenderAgreement.is_approved) && isShownOnPublicSite(lenderAgreement);
  }

  private static boolean isSsnLabel(final String label) {
    return label.toLowerCase().startsWith("_" + Admin.ssn.name().toLowerCase() + ":") || SSN_TOKEN.matcher(label).matches();
  }

  /**
   * FindOp turns every request key into a Datastore filter and the SSN property is indexed, so an
   * equality or prefix filter on it ("SSN", "SSN>", "SSN_"), a Query token, an order on it, or a
   * single-column projection of it (served from the property's index, hence sorted by it) would
   * confirm or recover SSN digits one query at a time even though the value itself is stripped from
   * the response. The match is a case-insensitive prefix, so it also refuses the lowercase ssn
   * fields of other kinds (Borrower, leads); no public consumer filters on those and refusing them is
   * the safer side.
   */
  private static void rejectAssociateSsnFilters(final JSON in) throws BadRequestException {
    final String ssn = Admin.ssn.name().toLowerCase();
    for (String key : in.keySet()) {
      if (key.toLowerCase().startsWith(ssn)) {
        throw new BadRequestException("Filtering on " + key + " is not allowed");
      }
    }
    for (String token : names(in.getRaw("Query"))) {
      if (token.toLowerCase().startsWith(ssn)) {
        throw new BadRequestException("Filtering on " + Admin.ssn.name() + " is not allowed");
      }
    }
    for (String order : names(in.getRaw(TableParams.ORDER.name()))) {
      if (order.toLowerCase().replaceFirst("^-", "").startsWith(ssn)) {
        throw new BadRequestException("Ordering by " + Admin.ssn.name() + " is not allowed");
      }
    }
    for (Field<List<String>> columns : List.of(TableParams.COLUMNS, TableParams.ADDL_COLUMNS)) {
      for (String column : names(in.getRaw(columns.name()))) {
        if (column.toLowerCase().contains(ssn)) {
          throw new BadRequestException("Projecting " + Admin.ssn.name() + " is not allowed");
        }
      }
    }
  }

  /** A request parameter that FindOp reads as a list of names, whether it arrived as a list or a single string. */
  private static List<String> names(final Object raw) {
    if (raw instanceof Iterable<?> items) {
      final List<String> result = new ArrayList<>();
      items.forEach(item -> result.add(String.valueOf(item)));
      return result;
    }
    return raw == null ? List.of() : List.of(String.valueOf(raw));
  }

  /**
   * Ops written for internal screens that would hand out or confirm associate SSNs if reached
   * through the anonymous execute door: the detector answers which candidate SSNs belong to active
   * employees, the export ops write the full default view (SSN column included) as CSV, and the
   * commission check exports print each officer's SSN into theirs. The door
   * never runs AbstractOp.acceptAccessToken, so an op's own permissions do not protect it here.
   * agentflow-ce3ey: the two loan officer registration ops are reached only through registerLoanOfficer,
   * registerWebinar and registerSigningAgreement, which strip the 1-1 call status and gate the signing link;
   * through the door they would skip both (record the call, build and return a link before it).
   */
  private static final List<Class<?>> PRIVATE_OPS = List.of(DetectEmployeeSSNsOp.class, ExportOp.class, ExportAdminOps.class,
          ExportAdminByLoanOfficerOp.class, EnsureSigningSessionsHRDocumentLoanOfficer.class, ExportCommissionCheckOp.class,
          RegisterInterestedLoanOfficer.class, EnsureSigningSessionsRegisterInterestedLoanOfficer.class);

  private static void rejectPrivateOp(final AbstractOp<?> operation) throws BadRequestException {
    if (PRIVATE_OPS.stream().anyMatch(privateOp -> privateOp.isInstance(operation))) {
      throw new BadRequestException("Operation is not available through this endpoint");
    }
  }

  /**
   * Generic reads may touch Admin (its SSN is stripped and cannot be filtered on, and moso-aid
   * depends on the read) but no other kind that carries the associate SSN: BlackListUser copies a
   * terminated associate's SSN into its labels as "_SSN:value" and as raw tokens (the label scrub in
   * the walk is only a second line behind this refusal), and WebinarAttendee has its own named
   * endpoints.
   */
  private static void rejectAssociateSsnCarriers(final Type type) throws BadRequestException {
    if (type != null && !Admin.TYPE.name().equals(type.name()) && type.hasField(Admin.ssn.name())) {
      throw new BadRequestException("Kind " + type.name() + " is not available through this endpoint");
    }
  }

  /**
   * Every kind a request names: the kind parameter, the key, and each entry of keys. GetOp trusts
   * the key over the kind and FindOp's keys list ignores the kind entirely, so a request may say
   * kind=Admin and still load another record; all of them are checked.
   */
  private static List<Type> requestedKinds(final JSON in) {
    final List<String> kinds = new ArrayList<>();
    final String kind = in.get(HasKey.kind);
    if (Strings.isNotEmpty(kind)) {
      kinds.add(kind);
    }
    if (in.hasValue(HasKey.key)) {
      kinds.add(kindOfKey(in.get(HasKey.key)));
    }
    for (String key : names(in.getRaw(HasKey.key.s().name()))) {
      kinds.add(kindOfKey(key));
    }
    final List<Type> types = new ArrayList<>();
    for (String name : kinds) {
      final Type type = typeNamed(name);
      if (type != null) {
        types.add(type);
      }
    }
    return types;
  }

  private static String blankToNull(final String value) {
    return Strings.isEmpty(value) ? null : value;
  }

  private static String kindOfKey(final String key) {
    try {
      return Server.bucket().stringToKey(key).getKind();
    } catch (RuntimeException e) {
      return null;
    }
  }

  private static Type typeNamed(final String kind) {
    if (Strings.isEmpty(kind)) {
      return null;
    }
    try {
      return Type.forName(kind);
    } catch (RuntimeException e) {
      return null;
    }
  }

  private static String getBaseUrl() {
    HasValues agent = AdminPages.getAdmin();
    if (agent == null || agent.getClass() == null) {
      agent = Server.getCompanyWithDBAInfo().load(Company.owner);
    }
    return agent.hasValue(Admin.domain_url) ? agent.get(Admin.domain_url) : Server.baseUrl();
  }

  private JSON getSuggestionData(JSON input, JSON resultQuery) {
    if (Boolean.TRUE.equals(input.getRaw("get_all"))) {
      return resultQuery;
    }

    return JSON.empty().set("_rows", resultQuery.get(QueryResult.rows).stream()
            .map(row -> row.getRaw(HasLabels.labels.name()))
            .collect(Collectors.toList()));
  }

  private List<HasValues> transferEntityKeys(List<Bean> beans) {
    List<HasValues> result = new ArrayList<>();

    beans.forEach(bean -> {
      HasValues values = JSON.create().copyFrom(bean);
      values.set(HasKey.key, bean.key());
      result.add(values);
    });

    return result;
  }

  @ApiMethod(name = "requestEmailOTP", path = "{ns}/requestEmailOTP", httpMethod = ApiMethod.HttpMethod.POST)
  public Object requestEmailOTP(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.demand(User.email);

      return OpRegistry.get(SendEmailOTPOp.class).execute(in);
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  @ApiMethod(name = "submitOTP", path = "{ns}/submitOTP", httpMethod = ApiMethod.HttpMethod.POST)
  public Object submitOTP(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.demand(User.email);
      in.demand(HasOTP.otp_code);
      HasValues result = OpRegistry.get(VerifyEmailOTPOp.class).execute(in);
      result.set("succeed", Strings.isEmpty(result.getRaw(SharedConstants.ERROR)));
      return result;
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  @ApiMethod(name = "getAdmins", path = "{ns}/getAdmins", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getAdmins(HttpServletRequest req, @Named("ns") String ns, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));

      return OpRegistry.get(ListAdminsFromCachedOp.class).execute(input);
    });
  }

  @ApiMethod(name = "getLoanCoordinator", path = "{ns}/getLoanCoordinator", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getLoanCoordinator(HttpServletRequest req, @Named("ns") String ns, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));

      List<Bean> beans = new Bundle().find(Admin.TYPE)
              .whereEquals(Admin.active, true)
              .whereEquals(Admin.is_setup_specialist, true)
              .whereEquals(Admin.is_lc_has_capacity_to_help_lo, true)
              .orderBy(Admin.total_all_source_review, false)
              .list(input.get(TableParams.LENGTH, 5));

      List<String> countCacheNames = new ArrayList<>();
      List<String> workingWithCacheNames = new ArrayList<>();
      beans.forEach(bean -> {
        countCacheNames.add(RefreshLoanCoordinatorCache.COUNT_PREFIX + bean.keyName());
        workingWithCacheNames.add(RefreshLoanCoordinatorCache.WORKING_WITH_PREFIX + bean.keyName());
      });

      Map<String, Integer> countCache = Server.cache().get(countCacheNames);
      Map<String, List<String>> workingWithCache = Server.cache().get(workingWithCacheNames);

      List<JSON> items = beans.stream()
              .map(new Function<Bean, JSON>() {
                @Override
                public JSON apply(Bean bean) {
                  JSON item = JSON.empty().copyFrom(bean,
                          Admin.key,
                          Admin.keyName,
                          Admin.first_name,
                          Admin.last_name,
                          Admin.full_name,
                          Admin.avatar,
                          Admin.time_zone,
                          Admin.total_all_source_review,
                          Admin.avg_rate_all_source_review,
                          Admin.total_colleagues_review,
                          Admin.average_score_colleagues_review,
                          Admin.employee_start_date,
                          Admin.preferred_languages
                  );
                  item.set("loans_count", getLoanCount(bean.keyName()), IntegerType.instance());
                  item.set("working_with", getWorkingWith(bean.keyName()), StringType.instance().listType());

                  return item;
                }

                private int getLoanCount(String keyName) {
                  Integer count = countCache.get(RefreshLoanCoordinatorCache.COUNT_PREFIX + keyName);
                  return count != null ? count
                          : RefreshLoanCoordinatorCache.getClosedLoanCount(new Bundle(), keyName);
                }

                private List<String> getWorkingWith(String keyName) {
                  List<String> workingWith = workingWithCache.get(RefreshLoanCoordinatorCache.WORKING_WITH_PREFIX + keyName);
                  return workingWith != null ? workingWith
                          : RefreshLoanCoordinatorCache.getWorkingWith(new Bundle(), keyName);
                }

              })
              .toList();

      return CellData.fromList(items);
    });
  }

  @ApiMethod(name = "getCorporateCoach", path = "{ns}/getCorporateCoach", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getCorporateCoach(HttpServletRequest req, @Named("ns") String ns, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));

      return CellData.fromList(new Bundle().find(Admin.TYPE)
              .whereEquals(Admin.active, true)
              .whereEquals(Admin.is_corporate_coach, true)
              .orderBy(Admin.created)
              .limit(99)
              .list(Admin.key,
                      Admin.keyName,
                      Admin.first_name,
                      Admin.last_name,
                      Admin.full_name,
                      Admin.avatar,
                      Admin.time_zone,
                      Admin.company_phone,
                      Admin.company_email,
                      Admin.total_all_source_review,
                      Admin.avg_rate_all_source_review,
                      Admin.total_colleagues_review,
                      Admin.average_score_colleagues_review,
                      Admin.marketplace_online,
                      Admin.marketplace_role,
                      Admin.can_go_live,
                      Admin.live_room_url
              ));
    });
  }

  @ApiMethod(name = "getCompanyLicensedStates", path = "{ns}/getCompanyLicensedStates", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getCompanyLicensedStates(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      final List<HasValues> companyLicenses = OpRegistry.get(GetCompanyLicensesOp.class).execute(in);
      List<Long> licenseInfoIds = companyLicenses.stream()
              .map(License.info)
              .filter(Objects::nonNull)
              .collect(Collectors.toSet())
              .stream().toList();
      List<Bean> licenseInfo = new Bundle().getByIds(LicenseInfo.TYPE, licenseInfoIds);
      Map<Long, Bean> licenseInfoMap = new HashMap<>();
      licenseInfo.forEach(item -> licenseInfoMap.put(item.id(), item));

      return CellData.fromList(companyLicenses.stream()
              .map(element -> {
                JSON newLicense = JSON.parse(element.toJSONString());
                newLicense.set(License.info.dot(), licenseInfoMap.get(element.get(License.info)));
                return newLicense;
              })
              .toList());
    });
  }

  @ApiMethod(name = "getCompanyLoanStatistic", path = "{ns}/getCompanyLoanStatistic", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getCompanyLoanStatistic(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return (JSON) OpRegistry.get(GetCompanyLoanStatistic.class).execute(in);
    });
  }

  @ApiMethod(name = "getLicenseStateInfo", path = "{ns}/getLicenseStateInfo", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getLicenseStateInfo(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return (JSON) OpRegistry.get(GetLicenseInfoByState.class).execute(in);
    });
  }

  @ApiMethod(name = "requestCreateTicket", path = "{ns}/requestCreateTicket", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON requestCreateTicket(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return new SaveOp().execute(JSON.empty()
              .set(HasKey.kind, EscalationTicket.TYPE.name())
              .set(FormParams.is_new, true)
              .set(EscalationTicket.link_to_transaction, false)
              .set(EscalationTicket.status, EscalationTicketStatus.New)
              .copyFrom(in, EscalationTicket.department, EscalationTicket.description, EscalationTicket.priority));
    });
  }

  @ApiMethod(name = "getBranchesLocationInfo", path = "{ns}/getBranchesLocationInfo", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getBranchesLocationInfo(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      List<HasValues> branches = Server.displayBranches();
      return JSON.empty().set("branches",
              branches.stream()
                      .filter(element -> element.hasValue(Branch.name))
                      .sorted(Comparator.comparing(o -> o.get(Branch.name)))
                      .map(hasValues -> hasValues.subMap(Branch.id, Branch.name, Branch.phone, Branch.full_address,
                              Branch.avatar_thumbnail, Branch.licensed_states, Branch.has_license_states,
                              Branch.avatar, Branch.has_avatar, Branch.state, Branch.lat, Branch.lng))
                      .collect(Collectors.toList()));
    });
  }

  @ApiMethod(name = "getListDepartmentInfo", path = "{ns}/getListDepartmentInfo", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getListDepartmentInfo(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      List<JSON> departments = new Bundle().find(DepartmentSetting.TYPE)
              .whereEquals(DepartmentSetting.active, true)
              .list(DepartmentSetting.id, DepartmentSetting.name,
                      DepartmentSetting.hours_ticket_response_turn_times, DepartmentSetting.description,
                      DepartmentSetting.notebook_lm, DepartmentSetting.department_hour_from_pst, DepartmentSetting.department_hour_to_pst,
                      DepartmentSetting.department_working_days, DepartmentSetting.department_disclaimer);
      return JSON.empty().set("departments", departments);
    });
  }

  @ApiMethod(name = "getBranchLocationInfo", path = "{ns}/getBranchLocationInfo", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getBranchLocationInfo(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      final HasValues branch = Server.displayBranch(in.id());
      if (branch.hasValue(Branch.branch_type) && branch.is(Branch.branch_type, com.mvu.core.shared.entity.Branch.BranchType.Home_office)) {
        return JSON.empty();
      }
      final JSON parse = JSON.parse(branch.toJSONString());
      if (branch.hasValue(Branch.licensed_branch_manager)) {
        final HasValues branchManager = branch.load(Branch.licensed_branch_manager);
        JSON branchManagerJson = branchManager != null ? JSON.parse(branchManager.toJSONString()) : null;
        parse.set(Branch.licensed_branch_manager.dot().name(), branchManagerJson);
      }
      return parse;
    });
  }

  @ApiMethod(name = "getColleaguesReview", path = "{ns}/getColleaguesReview", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON getColleaguesReview(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      if (!in.hasValue(ReviewColleagues.reviewee)) {
        throw new BadRequestException("reviewee is required");
      }
      List<Bean> reviews = new Bundle().find(ReviewColleagues.TYPE)
              .whereEquals(ReviewColleagues.reviewee, in.get(ReviewColleagues.reviewee))
              .limit(1000)
              .list();
      return JSON.empty().set("reviews", reviews);
    });
  }

  @ApiMethod(name = "getAllBranchesReview", path = "{ns}/getAllBranchesReview", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getAllBranchesReview(HttpServletRequest req, @Named("ns") String ns, JSON input) throws Exception {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      JSON result = JSON.empty();
      Map<String, List<HasValues>> branches = OpRegistry.get(GetCompanyBranchesWithGoogleReviews.class).execute(in);
      String baseUrl = getBaseUrl();
      for (String state : branches.keySet()) {
        for (HasValues branch : branches.get(state)) {
          List<HasValues> licenses = branch.is(Branch.id, 1L)
                  ? OpRegistry.get(GetCompanyLicensesOp.class).execute(in)
                  : branch.get(Branch.licenses);
          List<HasValues> newLicenses = new ArrayList<>();
          if (Colls.isNotEmpty(licenses)) {
            for (HasValues license : licenses) {
              if (license.hasValue(License.number)) {
                HasValues newLicense = JSON.create().copyFrom(license, License.state);
                newLicense.set("url", String.format("//www.nmlsconsumeraccess.org/%s",
                        branch.is(Branch.id, 1L) ? "EntityDetails.aspx/COMPANY/" : "Home.aspx/SubSearch?searchText=" + license.get(License.number)));
                newLicenses.add(newLicense);
              }
            }
          }
          branch.set(Branch.licenses, newLicenses);
          if (branch.hasValue(ReviewConfig.Location.total_review_count) && branch.hasValue(ReviewConfig.Location.avg_rating)
                  && branch.get(ReviewConfig.Location.avg_rating) < 4d) {
            branch.remove(ReviewConfig.Location.avg_rating);
          }
        }
      }
      result.set("branches", branches).set("baseUrl", baseUrl);
      return result;
    });
  }

  @ApiMethod(name = "getTotalActiveRealtorCount", path = "{ns}/getTotalActiveRealtorCount", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getTotalActiveRealtorCount(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      JSON result = JSON.empty();
      CellData data = OpRegistry.get(TotalActiveRealtorCountOp.class).execute(JSON.empty());
      return result.set(PartnerAgent.total_active_realtor, data.get(PartnerAgent.total_active_realtor, 0));
    });
  }

  @ApiMethod(name = "getAgentFindersInfo", path = "{ns}/getAgentFindersInfo", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON getAgentFindersInfo(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      JSON result = JSON.empty();
      int pageSize = in.getRaw("pageSize") == null ? 60 : Integer.parseInt("" + in.getRaw("pageSize"));
      String nextPageToken = in.getRaw("nextPageToken");
      String specialty = in.getRaw(PartnerAgent.specialty.name());
      String language = in.getRaw("language");
      Bundle bundle = new Bundle();
      bundle.readOnly();
      QueryBuilder<Bean> queryBuilder = bundle.find(PartnerAgent.TYPE)
              .whereEquals(PartnerAgent.status, ReferralAgentStatus.Active);
      if (specialty != null) {
        queryBuilder.whereEquals(PartnerAgent.specialty, Collections.singletonList(RealtorSpecialtyType.valueOf(specialty)));
      }
      if (language != null) {
        queryBuilder.whereEquals(PartnerAgent.preferred_languages, Collections.singletonList(LanguageLibrary.valueOf(language)));
      }
      String countyName = in.get(Address.county_name);
      if (Strings.isNotEmpty(countyName)) {
        String state = in.get(Admin.state);
        if (Strings.isNotEmpty(state)) {
          queryBuilder.whereEquals(Admin.labels, Colls.asList(Strings.countySearch(state, countyName)));
        }
      }
      Boolean recommended = in.get(PartnerAgent.is_recommended);
      if (Objects.nonNull(recommended)) {
        queryBuilder.whereEquals(PartnerAgent.is_recommended, recommended);
      }
      String city = in.get(PartnerAgent.city);
      if (Strings.isNotEmpty(city)) {
        queryBuilder.whereEquals(PartnerAgent.city, city);
      }
      if (in.hasValue(PartnerAgent.labels)) {
        queryBuilder.whereEquals(PartnerAgent.labels, in.get(PartnerAgent.labels));
      }

      queryBuilder.whereEquals(PartnerAgent.has_avatar, true);

      if (nextPageToken == null) {
        result.set("total", queryBuilder.count(MAX_QUERY));
      }
      Tuple2<String, List<Bean>> data = queryBuilder
              .orderBy(PartnerAgent.is_recommended, false)
              .getChunk(pageSize, nextPageToken);
      return result.set("agents", transferEntityKeys(data.getValue())).set("nextPageToken", data.getKey());
    });
  }

  @ApiMethod(name = "getAdminWebsiteInfo", path = "{ns}/getAdminWebsiteInfo/{key}", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getAdminWebsiteInfo(HttpServletRequest req, @Named("ns") String ns, @Named("key") String key, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));

      Bundle bundle = new Bundle();
      Bean admin = bundle.get(key);
      if (admin == null || !admin.typeis(Admin.TYPE)) {
        throw new BadRequestException("does not exist");
      }

      return JSON.empty().copyFrom(admin, Admin.ADMIN_WEBSITE_FIELDS);
    });
  }

  @ApiMethod(name = "getBestPriceGuarantee", path = "{ns}/getBestPriceGuarantee/{key}", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getBestPriceGuarantee(HttpServletRequest req, @Named("ns") String ns, @Named("key") String key, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));

      Bundle bundle = new Bundle();
      Bean admin = bundle.get(key);
      if (admin == null || !admin.typeis(Admin.TYPE)) {
        throw new BadRequestException("does not exist");
      }
      createSectionUser(admin.key());

      return new PreviewTemplateOp().execute(JSON.empty().type(Template.TYPE).set(Template.keyName, "best_price_guarantee_form_v3"));
    });
  }

  @ApiMethod(name = "enableBestPriceGuaranteeProgram", path = "{ns}/enableBestPriceGuaranteeProgram/{key}", httpMethod = ApiMethod.HttpMethod.POST)
  public Object enableBestPriceGuaranteeProgram(HttpServletRequest req, @Named("ns") String ns, @Named("key") String key, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      Bundle bundle = new Bundle();
      Bean admin = bundle.get(key);
      if (admin == null || !admin.typeis(Admin.TYPE)) {
        throw new BadRequestException("does not exist");
      }

      Boolean isAdmin = in.remove(new Field<>("isAdmin", BooleanType.instance()));
      if (!Boolean.TRUE.equals(isAdmin)) {
        createSectionUser(admin.key());
      }

      return new SaveOp().execute(JSON.empty()
              .set(Admin.key, admin.key())
              .set(Admin.agree_terms_and_conditions, true)
              .set(Admin.show_lowest_rate_campaign, true));
    });
  }

  @ApiMethod(name = "getAdminQMPricerSettings", path = "{ns}/getAdminQMPricerSettings/{key}", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getAdminQMPricerSettings(HttpServletRequest req, @Named("ns") String ns, @Named("key") String key, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));

      Bundle bundle = new Bundle();
      Bean admin = bundle.get(key);
      if (admin == null || !admin.typeis(Admin.TYPE)) {
        throw new BadRequestException("does not exist");
      }

      return JSON.empty().copyFrom(admin, Admin.ADMIN_QM_PRICER_FIELDS);
    });
  }

  @ApiMethod(name = "updateAdminWebsiteInfo", path = "{ns}/updateAdminWebsiteInfo/{key}", httpMethod = ApiMethod.HttpMethod.POST)
  public Object updateAdminWebsiteInfo(HttpServletRequest req, @Named("ns") String ns, @Named("key") String key, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));

      Bundle bundle = new Bundle();
      Bean admin = bundle.get(key);
      if (admin == null || !admin.typeis(Admin.TYPE)) {
        throw new BadRequestException("does not exist");
      }

      Boolean isAdmin = in.remove(new Field<>("isAdmin", BooleanType.instance()));
      if (!Boolean.TRUE.equals(isAdmin)) {
        createSectionUser(admin.key());
      }

      admin.copyFrom(input, Admin.ADMIN_WEBSITE_FIELDS).save();
      return JSON.empty().copyFrom(admin, Admin.ADMIN_WEBSITE_FIELDS);
    });
  }

  @ApiMethod(name = "updatePAWebsiteInfo", path = "{ns}/updatePAWebsiteInfo/{key}", httpMethod = ApiMethod.HttpMethod.POST)
  public Object updatePAWebsiteInfo(HttpServletRequest req, @Named("ns") String ns, @Named("key") String key, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));

      Bundle bundle = new Bundle();
      Bean pa = bundle.get(key);
      if (pa == null || !pa.typeis(PartnerAgent.TYPE)) {
        throw new BadRequestException("does not exist");
      }
      createSectionUser(pa.key());

      pa.copyFrom(input, Admin.ADMIN_WEBSITE_FIELDS).save();
      return JSON.empty().copyFrom(pa, Admin.ADMIN_WEBSITE_FIELDS);
    });
  }

  @ApiMethod(name = "subscribe", path = "{ns}/subscribe/{key}", httpMethod = ApiMethod.HttpMethod.POST)
  public Object subscribe(HttpServletRequest req, @Named("ns") String ns, @Named("key") String key, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");

      Bundle bundle = new Bundle();
      Bean admin = bundle.get(key);
      if (admin == null || !admin.typeis(Admin.TYPE)) {
        throw new BadRequestException("does not exist");
      }

      ThreadContext.setAnonymousId(admin.kind(), admin.keyName());

      String result = new SubscribeOp().execute(in);
      return result.replace("data-ui-message=", "");
    });
  }

  @ApiMethod(name = "getVerifyDomainToken", path = "{ns}/getVerifyDomainToken", httpMethod = ApiMethod.HttpMethod.POST)
  public Object getVerifyDomainToken(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      input.demand(AddDomainRequest.domain);
      return OpRegistry.get("GetVerifyDomainTokenOp").execute(input);
    });
  }

  @ApiMethod(name = "verifyDomain", path = "{ns}/verifyDomain", httpMethod = ApiMethod.HttpMethod.POST)
  public Object verifyDomain(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      input.demand(AddDomainRequest.domain);
      input.demand(AddDomainRequest.owner);
      return OpRegistry.get("VerifyDomainOp").execute(input);
    });
  }

  @ApiMethod(name = "findSuggestions", path = "{ns}/findSuggestions/{kind}", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON findSuggestion(HttpServletRequest req, @Named("ns") String ns, @Named("kind") String kind, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      Type type = getEntityType(kind);
      if (type.hasField(Admin.ssn.name())) {
        // No public site reads associates through this path, and a suggestion row is the whole
        // record plus every matching label token, so the kinds that carry the associate SSN
        // (Admin, BlackListUser, WebinarAttendee) are refused outright.
        throw new BadRequestException("Kind " + type.name() + " is not available through this endpoint");
      }
      if (in.containsKey(HasLabels.labels.name())) {
        String labels = in.getRaw(HasLabels.labels.name());
        return getSuggestionData(in, OpRegistry.get(FindSuggestionsOp.class).execute(JSON.empty().type(type).set("labels>", labels)));
      } else {
        throw new BadRequestException("\"labels\" is required!");
      }
    });
  }

  @ApiMethod(name = "getTestimonialsBranchesReview", path = "{ns}/testimonial/getBranchesReview", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getTestimonialsBranchesReview(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      List<HasValues> reviews = new ArrayList<>();
      Bundle bundle = new Bundle();
      bundle.readOnly();
      Map<Long, String> branches = bundle.find(Branch.TYPE)
              .whereEquals(Branch.active, true)
              .limit(1000)
              .list()
              .stream()
              .filter(bean -> bean.isNot(Branch.outsourcing))
              .map((bean -> bean.copyFrom(bean, Branch.id, Branch.name)))
              .collect(Collectors.toMap(Branch.id, Branch.name));
      Bean reviewConfig = bundle.get(ReviewConfig.TYPE, 1L);
      if (reviewConfig == null) {
        throw new BadRequestException("ReviewConfig must be set up!");
      }
      List<HasValues> locations = reviewConfig.get(ReviewConfig.google_locations)
              .stream()
              .sorted(Comparator.comparingInt(l -> -l.get(ReviewConfig.Location.total_review_count, 0)))
              .collect(Collectors.toList());
      for (HasValues location : locations) {
        Long branchID = location.get(ReviewConfig.Location.branch);
        if (location.is(ReviewConfig.Location.select) && branchID != null && branches.containsKey(branchID)) {
          HasValues review = JSON.create();
          review.copyFrom(location, ReviewConfig.Location.avg_rating, ReviewConfig.Location.total_review_count, ReviewConfig.Location.map_url);
          review.set("branch", branches.get(branchID));
          reviews.add(review);
        }
      }
      return reviews.isEmpty() ? JSON.empty() : JSON.empty().set("reviews", reviews);
    });
  }

  @ApiMethod(name = "getTestimonialsClientsReview", path = "{ns}/testimonial/getClientReviews", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON getTestimonialsClientsReview(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      JSON result = JSON.empty();
      int pageSize = in.getRaw("pageSize") == null ? 9 : Integer.parseInt("" + in.getRaw("pageSize"));
      String nextPageToken = in.getRaw("nextPageToken");
      Bundle bundle = new Bundle();
      bundle.readOnly();
      QueryBuilder<Bean> queryBuilder = bundle.find(Review.TYPE)
              .whereEquals(Review.source, ReviewSource.Google)
              .whereEquals(Review.rating, 5);
      if (nextPageToken == null) {
        result.set("total", queryBuilder.count(10000));
      }
      Tuple2<String, List<Bean>> data = queryBuilder.getChunk(pageSize, nextPageToken);
      return result.set("reviews", data.getValue()).set("nextPageToken", data.getKey());
    });
  }

  @ApiMethod(name = "getStatesLicensesOp", path = "{ns}/getStatesLicensesOp", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getStatesLicensesOp(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      List<JSON> result = new ArrayList<>();
      List<HasValues> licenses = OpRegistry.get(GetCompanyLicensesOp.class).execute(in);
      if (Colls.isNotEmpty(licenses)) {
        licenses.forEach(license -> {
          JSON newLicense = JSON.empty();
          newLicense.copyFrom(license);
          newLicense.set("state", license.get(License.state));
          newLicense.set("more_info", new Bundle().get(LicenseInfo.TYPE, license.get(License.info)).getProperties());
          result.add(newLicense);
        });
      }
      return JSON.empty().set("licenses", result);
    });
  }

  @ApiMethod(name = "getAllLenderLogos", path = "{ns}/getAllLenderLogos", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getAllLenderLogos(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      List<JSON> lenders = new ArrayList<>();
      Bundle bundle = new Bundle();
      bundle.readOnly();
      List<Bean> lenderAgreements = bundle.find(LenderAgreement.TYPE)
              .whereEquals(LenderAgreement.is_approved, true)
              .limit(MAX_QUERY)
              .list();
      for (Bean lenderAgreement : lenderAgreements) {
        if (isShownOnPublicSite(lenderAgreement)) {
          JSON lender = JSON.empty().copyFrom(lenderAgreement,
                  LenderAgreement.key, LenderAgreement.logo, LenderAgreement.logo_thumbnail);
          lender.set(HasName.name, lenderAgreement.get(LenderAgreement.lender_name));
          lenders.add(lender);
        }
      }
      return JSON.empty().set("lenders", lenders);
    });
  }

  @ApiMethod(name = "getBestRateByState", path = "{ns}/getBestRateByState", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getBestRateByState(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      List<Bean> rates = new Bundle().readOnly().find(BestRateRecord.TYPE)
              .whereEquals(BestRateRecord.history_date, NO_HISTORY)
              .list(Integer.MAX_VALUE);
      if (Colls.isEmpty(rates)) {
        throw new BadRequestException("Cannot find the best rates.");
      }
      Map<String, HasValues> bestRates = initBestRateCaseName();
      HasValues config = getBestRateConfig(rates);
      config.set(BestRateRecord.updated, rates.stream().map(BestRateRecord.updated).max(Comparator.naturalOrder()).orElse(null));
      createBestRateCriteria(config, bestRates);
      return JSON.empty().set("bestRates", setBestRateRowData(rates, bestRates));
    });
  }

  @ApiMethod(name = "countLoanOfficer", path = "{ns}/countLoanOfficer", httpMethod = ApiMethod.HttpMethod.GET)
  public Object countLoanOfficer(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      return OpRegistry.get(LoanOfficerCountOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getDownloadAppCode", path = "{ns}/getDownloadAppCode", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getDownloadAppCode(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));

      String targetLink = Server.baseUrl() + "/company_qr_invitation_download_app";

      final String key = input.get(User.key);
      if (StringUtils.isNotEmpty(key)) {
        final Bean loanOfficer = new Bundle().get(key);
        if (Objects.nonNull(loanOfficer)) {
          targetLink = "%s/qr_invitation?inviter=%s".formatted(loanOfficer.get(Admin.company_domain_url), loanOfficer.get(Admin.company_email));
        }
      }
      return new ShortenUrlWithFirebaseOp()
              .execute(JSON.empty().set("current_link", targetLink));
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  private Map<String, HasValues> setBestRateRowData(List<Bean> rates, Map<String, HasValues> bestRates) {
    Map<Field<Double>, String> programs = new HashMap<>();
    programs.put(BestRateRecord.Info.rate_15, LoanProgram.FIXED_15_Y);
    programs.put(BestRateRecord.Info.apr_15, LoanProgram.FIXED_15_Y);
    programs.put(BestRateRecord.Info.rate_30, LoanProgram.FIXED_30_Y);
    programs.put(BestRateRecord.Info.apr_30, LoanProgram.FIXED_30_Y);

    bestRates.keySet().forEach(key -> {
      HasValues rateTab = bestRates.get(key);
      PurposeType purposeType = rateTab.get(Quote.purpose);
      LoanType loanType = rateTab.get(Quote.loan_type);
      List<HasValues> resultRates = rateTab.get(RateTable.rates, new ArrayList<>());

      for (Bean rate : rates) {
        HasValues info = rate.get(BestRateRecord.infos).get(BestRateRecord.InfoKey.apply(purposeType, loanType), JsonObjectType.instance());
        HasValues stateRate = JSON.create();
        stateRate.set(BestRateRecord.state, rate.get(BestRateRecord.state));

        programs.keySet().forEach(field -> {
          stateRate.set(field, info == null ? null : info.get(field));
          stateRate.set(field.name() + "_url_params",
                  info == null ? null : createRateInfoUrlParams(rate, programs.get(field), purposeType, loanType));
        });

        resultRates.add(stateRate);
      }

      rateTab.set(RateTable.rates, resultRates);
      bestRates.put(key, rateTab);
    });

    return bestRates;
  }

  private JSON createRateInfoUrlParams(Bean rate, String loanProgram, PurposeType purposeType, LoanType loanType) {
    JSON params = JSON.empty()
            .set(Quote.zip, rate.get(BestRateRecord.zip))
            .set(Quote.loan_program, loanProgram)
            .set(Quote.purpose, purposeType)
            .set(Quote.loan_type, loanType)
            .set(Quote.income_to_ami, LoanQuoteUtils.defaultBestRateIncomeToAmi());

    if (rate.hasValue(BestRateRecord.config)) {
      HasValues criteria = getCriteriaFromConfig(purposeType, loanType, rate.get(BestRateRecord.config));
      params.copyFrom(criteria, BestRateRecord.CONFIG_FIELDS);
      params.copyFrom(criteria, Quote.impounds);

      if (LoanType.FHA.equals(loanType)) {
        params.copyFrom(LoanQuoteUtils.fhaBestRateConfig());
      } else if (LoanType.VA.equals(loanType)) {
        params.copyFrom(LoanQuoteUtils.vaBestRateConfig());
      }
    }

    return params;
  }

  private HasValues getCriteriaFromConfig(PurposeType purposeType, LoanType loanType, HasValues config) {
    return LoanQuoteUtils.ensureDefaultBestRateConfig(purposeType, loanType,
            config.get(BestRateRecord.InfoKey.apply(purposeType, loanType), JsonObjectType.instance()));
  }

  private HasValues getBestRateConfig(List<Bean> rates) {
    Optional<Bean> first = rates.stream().filter(row -> row.hasValue(BestRateRecord.config)).findFirst();
    return first.isPresent() ? first.get().get(BestRateRecord.config) : JSON.create();
  }

  private Map<String, HasValues> initBestRateCaseName() {
    Map<String, HasValues> bestRates = new HashMap<>();

    BestRateRecord.BEST_RATE_TABS.forEach(bestRateTab -> {
      HasValues values = JSON.create().set(HasName.name, bestRateTab.name())
              .set(Quote.purpose, bestRateTab.purpose())
              .set(Quote.loan_type, bestRateTab.loanType());
      bestRates.put(bestRateTab.infoKey(), values);
    });

    return bestRates;
  }

  private void createBestRateCriteria(HasValues config, Map<String, HasValues> bestRates) {
    bestRates.keySet().forEach(key -> {
      HasValues rateTab = bestRates.get(key);
      PurposeType purposeType = rateTab.get(Quote.purpose);
      LoanType loanType = rateTab.get(Quote.loan_type);

      HasValues criteria = getCriteriaFromConfig(purposeType, loanType, config);
      criteria.copyFrom(config, HasKey.updated);
      rateTab.set("criteria", criteria);

      bestRates.put(key, rateTab);
    });
  }

  @ApiMethod(name = "sendEmail", path = "{ns}/sendEmail", httpMethod = ApiMethod.HttpMethod.POST)
  public Object sendEmail(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(in));
      in.remove("ns");
      in.demand(EmailParams.template);
      new EmailTemplateOp().execute(in);
      return "success";
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  /**
   * Send the "invite to conversation" email on behalf of moso-chat. moso-chat owns the
   * invite token (it validates it on accept); this endpoint only wraps the token into a
   * deep link and renders the {@code invite_to_conversation} template. The short dynamic
   * link is built here in code. Recipient resolves from the template's
   * {@code "to": ["${inviteeEmail}"]}. The room avatar is a cluster of up to 3 member
   * avatar URLs ({@code memberAvatar1..3}) supplied by moso-chat.
   */
  @ApiMethod(name = "inviteToConversation", path = "{ns}/inviteToConversation", httpMethod = ApiMethod.HttpMethod.POST)
  public Object inviteToConversation(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(in));
      in.remove("ns");

      final String inviteeEmail = in.get(new Field<>("inviteeEmail", StringType.instance()), "");
      if (Strings.isEmpty(inviteeEmail)) {
        throw new BadRequestException("inviteeEmail is required");
      }
      final String token = in.get(new Field<>("token", StringType.instance()), "");
      if (Strings.isEmpty(token)) {
        throw new BadRequestException("token is required");
      }
      final String inviterName = in.get(new Field<>("inviterName", StringType.instance()), "");
      final String conversationName = in.get(new Field<>("conversationName", StringType.instance()), "");
      final String memberCount = in.get(new Field<>("memberCount", StringType.instance()), "");
      final String memberAvatar1 = in.get(new Field<>("memberAvatar1", StringType.instance()), "");
      final String memberAvatar2 = in.get(new Field<>("memberAvatar2", StringType.instance()), "");
      final String memberAvatar3 = in.get(new Field<>("memberAvatar3", StringType.instance()), "");
      final String moreMembers = in.get(new Field<>("moreMembers", StringType.instance()), "");

      // Resolve the email "from" to the inviter's company email via their LoanFactory
      // key, so the invite is sent on behalf of the person who invited. Falls back to
      // the template default when the key is missing or the admin can't be resolved.
      final String inviterKey = in.get(new Field<>("inviterKey", StringType.instance()), "");
      String fromEmail = "";
      if (!inviterKey.isEmpty()) {
        final Bean inviterAdmin = new Bundle().get(inviterKey);
        if (inviterAdmin != null) {
          final String companyEmail = inviterAdmin.get(Admin.company_email);
          if (companyEmail != null && !companyEmail.isEmpty()) {
            fromEmail = companyEmail;
          }
        }
      }

      // The invite link carries only the opaque token (+ email hint) — never the
      // conversation id — so it cannot be tampered with to join another conversation.
      // The short dynamic link is built here in code (not in the email template).
      final String longLink = Server.baseUrl() + "/chat/invite"
              + "?token=" + encodeInviteParam(token)
              + "&email=" + encodeInviteParam(inviteeEmail);
      final String dynamicLink = DynamicLinkCreator.getInstance().createShortDynamicLink(longLink);

      final JSON emailInput = JSON.empty()
              .set(EmailParams.template, "invite_to_conversation")
              .set("inviteeEmail", inviteeEmail)
              .set("inviterName", inviterName)
              .set("conversationName", conversationName)
              .set("memberCount", memberCount)
              .set("memberAvatar1", memberAvatar1)
              .set("memberAvatar2", memberAvatar2)
              .set("memberAvatar3", memberAvatar3)
              .set("moreMembers", moreMembers)
              .set("fromEmail", fromEmail)
              .set("url", dynamicLink);
      new EmailTemplateOp().execute(emailInput);

      return JSON.empty().set("status", "success");
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  private static String encodeInviteParam(final String value) {
    return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
  }

  @ApiMethod(name = "getZipCode", path = "{ns}/getZipCode/{zip}", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getZipCode(HttpServletRequest req, @Named("ns") String ns, @Named("zip") String zip, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return OpRegistry.get(GetOp.class).execute(in.type(ZipCode.TYPE).set(ZipCode.id, Long.valueOf(zip)));
    });
  }

  @ApiMethod(name = "loadTemplateOp", path = "{ns}/loadTemplateOp", httpMethod = ApiMethod.HttpMethod.POST)
  public Object loadTemplateOp(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      return OpRegistry.get(GetTemplateOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getNextWebinars", path = "{ns}/getNextWebinars", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getNextWebinars(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      String type = in.getRaw("type");
      CellData result = OpRegistry.get(GetNextWebinarsOp.class).execute(JSON.empty().set(Webinar.type, WebinarType.valueOf(type)));
      return JSON.empty().set("webinars", result.get(QueryResult.rows));
    });
  }

  @ApiMethod(name = "registerWebinar", path = "{ns}/registerWebinar", httpMethod = ApiMethod.HttpMethod.POST)
  public Object registerWebinar(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(LORecruiting.TYPE);
      in.set(LORecruiting.register_for_webinar, true);
      // Not part of the webinar form: it can neither set nor clear the compliance disclosure.
      MortgageWebsiteDisclosure.stripFromBody(in);
      stripMeetingStatus(in);
      stripFeeAndAgreementFields(in);
      stripCreditFields(in);
      JSON response = OpRegistry.get(RegisterInterestedLoanOfficer.class).execute(in);
      Bean webinar = response.get(LORecruiting.webinar.dot());
      if (webinar != null) {
        response.set(LORecruiting.webinar.dot(), JSON.parse(webinar.toJSONString()));
      }
      return withoutSigningLink(LeadOriginStamp.stripFromResponse(response));
    });
  }

  @ApiMethod(name = "findALoanOfficer", path = "{ns}/findALoanOfficer", httpMethod = ApiMethod.HttpMethod.POST)
  public Object findALoanOfficer(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      if (in.hasValue(Admin.mortgage_nmls)) {
        // Same findable filter as the list path, and the same public field list: a raw FindOp
        // row is the whole Admin record (SSN included) and this endpoint is anonymous.
        List<HasValues> officers = FindLoanOfficerOp.findableLoanOfficerQuery()
                .whereEquals(Admin.mortgage_nmls, in.get(Admin.mortgage_nmls))
                .toCellData(JSON.empty().set(TableParams.LENGTH, 1), FindLoanOfficerOp.publicProfileFields())
                .getRows();
        return officers.isEmpty() ? null : officers.get(0);
      } else {
        if (!in.containsKey(TableParams.LENGTH.name())) {
          in.set(TableParams.LENGTH, 60);
        }
        return OpRegistry.get(FindLoanOfficerOp.class).execute(in);
      }
    });
  }

  @ApiMethod(name = "getLoanOfficersByOriginState", path = "{ns}/getLoanOfficersByOriginState", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getLoanOfficersByOriginState(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return LoanOps.getLoanOfficersByOriginState();
    });
  }

  @ApiMethod(name = "findARecruiterLive", path = "{ns}/findARecruiterLive", httpMethod = ApiMethod.HttpMethod.GET)
  public Object findARecruiterLive(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return getRecruiters();
    });
  }

  @ApiMethod(name = "getInfoCompany", path = "{ns}/getInfoCompany", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getInfoCompany(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return OpRegistry.get(CompanyInfoOp.class).execute(in);
    });
  }

  @ApiMethod(name = "executeOp", path = "{ns}/execute/{op}", httpMethod = ApiMethod.HttpMethod.POST)
  public Object executeOp(HttpServletRequest req, @Named("ns") String ns, @Named("op") String op, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.remove("op");
      final AbstractOp<JSON> operation = OpRegistry.get(op);
      rejectPrivateOp(operation);
      final boolean anonymous = Server.currentUser() == null;
      final List<Type> requestedKinds = requestedKinds(in);
      for (Type requested : requestedKinds) {
        rejectAssociateSsnCarriers(requested);
      }
      if (anonymous) {
        AnonymousBorrowerGuard.rejectBorrowerKind(requestedKinds);
      }
      if (operation instanceof FindOp) {
        rejectAssociateSsnFilters(in);
      }
      final Object result = operation.execute(in);
      // An anonymous caller gets no Borrower record (kind Borrower is refused above, and a "$" foreign key
      // column holding one is dropped) and no ssn field of any kind back through this door (leads);
      // a logged-in caller keeps its own fields.
      return anonymous ? withoutAnySsn(AnonymousBorrowerGuard.withoutBorrowerRecords(result)) : result;
    });
  }

  @ApiMethod(name = "getLendersLicensedInStates", path = "{ns}/getLendersLicensedInStates", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getLendersLicensedInStates(HttpServletRequest req, @Named("ns") String ns, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));
      if (input.hasValue(Loan.state)) {
        return OpRegistry.get(GetLendersLicensedInStateOp.class).execute(input);
      } else {
        throw new BadRequestException("state is required");
      }
    });
  }

  @ApiMethod(name = "getLoanConfiguration", path = "{ns}/getLoanConfiguration", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getLoanConfiguration(HttpServletRequest req, @Named("ns") String ns, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return anonymousView(new Bundle().get(LoanConfiguration.TYPE, LoanConfiguration.DEFAULT_ID), LoanConfiguration.TYPE);
    });
  }

  @ApiMethod(name = "getLenderAgreement", path = "{ns}/getLenderAgreement/{id}", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getLenderAgreement(HttpServletRequest req, @Named("ns") String ns, @Named("id") Long id, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));
      if (id == null) {
        throw new BadRequestException("id is required");
      }
      return anonymousView(new Bundle().get(LenderAgreement.TYPE, id), LenderAgreement.TYPE);
    });
  }

  @ApiMethod(name = "getAlert", path = "{ns}/getAlert/{key}", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getAlert(HttpServletRequest req, @Named("ns") String ns, @Named("key") String key, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));
      if (Strings.isEmpty(key)) {
        throw new BadRequestException("key is required");
      }

      Bean loan = new Bundle().get(key);

      if (loan == null || !loan.typeis(Loan.TYPE) || !LoanUtils.isAlertOnly(loan)) {
        throw new BadRequestException("alert is not exists");
      }

      return anonymousView(loan, Loan.TYPE);
    });
  }

  @ApiMethod(name = "getStateTax", path = "{ns}/getStateTax", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getStateTax(HttpServletRequest req, @Named("ns") String ns, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return new GetStateTax().execute(input);
    });
  }

  @ApiMethod(name = "getMonthlyMortgageInsurance", path = "{ns}/getMonthlyMortgageInsurance", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getMonthlyMortgageInsurance(HttpServletRequest req, @Named("ns") String ns, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return new GetMonthlyMortgageInsuranceOp().execute(input);
    });
  }

  @ApiMethod(name = "saveLeadConsumers", path = "{ns}/saveLeadConsumers", httpMethod = ApiMethod.HttpMethod.POST)
  public Object saveLeadConsumers(HttpServletRequest req, @Named("ns") String ns, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return new SaveLeadConsumersOp().execute(input);
    });
  }

  @ApiMethod(name = "getCampaign", path = "{ns}/getCampaign/{id}", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getCampaign(HttpServletRequest req, @Named("ns") String ns, @Named("id") Long id, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));
      if (id == null) {
        throw new BadRequestException("id is required");
      }
      return anonymousView(new Bundle().get(Campaign.TYPE, id), Campaign.TYPE);
    });
  }

  @ApiMethod(name = "getArticle", path = "{ns}/getArticle/{n}", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getArticle(HttpServletRequest req, @Named("ns") String ns, @Named("n") String n, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));
      if (Strings.isEmpty(n)) {
        throw new BadRequestException("keyName is required");
      }
      Bean bean = new Bundle().get(Article.TYPE, n);
      String adminKeyName = ThreadContext.anonymousId(Admin.TYPE);
      if (Strings.isNotEmpty(adminKeyName) && !bean.contain(Article.owners, adminKeyName)) {
        throw new NotFoundException("Article not found");
      }
      LinkedList<Field> fields = Article.TYPE.defaultFields();
      Stream.of(Admin.full_name, Admin.avatar, Admin.avatar_thumbnail)
              .forEach(f -> fields.add(Article.article_author.dot(f)));
      return bean.toMap(fields);
    });
  }

  @ApiMethod(name = "findTodayRate", path = "{ns}/findTodayRate", httpMethod = ApiMethod.HttpMethod.POST)
  public Object findTodayRate(HttpServletRequest req, @Named("ns") String ns, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return new FindTodayRateOp().execute(in);
    });
  }

  @ApiMethod(name = "rateTableRates", path = "{ns}/rateTableRates", httpMethod = ApiMethod.HttpMethod.POST)
  public Object rateTableRates(HttpServletRequest req, @Named("ns") String ns, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return new RateTableRates().execute(in);
    });
  }

  @ApiMethod(name = "runPylonPricing", path = "{ns}/runPylonPricing", httpMethod = ApiMethod.HttpMethod.POST)
  public Object runPylonPricing(HttpServletRequest req, @Named("ns") String ns, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return new RunPylonPricingOp().execute(input);
    });
  }

  @ApiMethod(name = "getTemplateContent", path = "{ns}/getTemplateContent", httpMethod = ApiMethod.HttpMethod.POST)
  public Object getTemplateContent(HttpServletRequest req, @Named("ns") String ns, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return new GetTemplateContentOp().execute(input);
    });
  }

  @ApiMethod(name = "getLOInfo", path = "{ns}/getLOInfo/{key}", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getLOInfo(HttpServletRequest req, @Named("ns") String ns, @Named("key") String key, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));
      if (Strings.isEmpty(key)) {
        throw new BadRequestException("key is required");
      }
      Bean admin = new Bundle().get(key);

      if (admin == null || !admin.typeis(Admin.TYPE) || !admin.is(Admin.is_loan_originator)) {
        throw new BadRequestException("does not exist");
      }
      // A raw Bean is serialised by Endpoints with its whole property map (SSN included); hand out
      // the public profile instead.
      return admin.toMap(FindLoanOfficerOp.publicProfileFields());
    });
  }

  /**
   * Resume read for the anonymous /register-loan-officer form. execute/GetOp refuses LORecruiting
   * (it carries the associate SSN), so this loads one LORecruiting by key and returns only the
   * whitelisted fields the form reads.
   */
  @ApiMethod(name = "getRegisterLoanOfficer", path = "{ns}/getRegisterLoanOfficer", httpMethod = ApiMethod.HttpMethod.POST)
  public Object getRegisterLoanOfficer(HttpServletRequest req, @Named("ns") String ns, @Named("key") String key, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));
      if (Strings.isEmpty(key) || !LORecruiting.TYPE.name().equals(kindOfKey(key))) {
        throw new BadRequestException("key is not a Loan Officer registration");
      }
      // The key must belong to the namespace the request is pinned to (default namespace is "" in a
      // key and null in NS).
      final String keyNamespace = blankToNull(com.google.appengine.api.datastore.KeyFactory.stringToKey(key).getNamespace());
      if (!Objects.equals(keyNamespace, blankToNull(NS.get()))) {
        throw new BadRequestException("key is not a Loan Officer registration");
      }
      final Bean registration = new Bundle().get(key);
      if (registration == null) {
        throw new BadRequestException("Registration not found");
      }
      final JSON profile = registration.toMap(RegisterLoanOfficerProfile.fields());
      if (!RegisterLoanOfficerProfile.isSigningLinkServable(registration)) {
        // agentflow-ce3ey: no link before the 1-1 call (one built before the fix included) or while the fee is due.
        profile.remove(LORecruiting.url_signing_sessions.name());
      }
      return profile;
    });
  }

  @ApiMethod(name = "getMeetingAndAppointmentConfiguration", path = "{ns}/getMeetingAndAppointmentConfiguration", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getMeetingAndAppointmentConfiguration(HttpServletRequest req, @Named("ns") String ns, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input));
      final Bean config = new Bundle().get(MeetingAndAppointmentConfiguration.TYPE, MeetingAndAppointmentConfiguration.DEFAULT_ID);
      // A raw Bean is serialised by Endpoints with its whole property map, and this record also holds
      // server-only credentials (PayPal secret, Calendly token and signing key). Return the same view an
      // anonymous GetOp read gets: only the fields flagged public.
      return config == null ? null : config.toMap(FindOp.getView(JSON.empty(), MeetingAndAppointmentConfiguration.TYPE));
    });
  }

  @ApiMethod(name = "getCaptchaInfo", path = "{ns}/getCaptchaInfo", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getCaptchaInfo(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      return JSON.empty()
              .set(SharedConstants.CAPTCHA_SITE_KEY, Server.getSystemProperty(SharedConstants.CAPTCHA_SITE_KEY))
              .set(FacebookConfiguration.show_captcha, isEnabledCaptcha());
    });
  }

  @ApiMethod(name = "availableToChat", path = "{ns}/availableToChat", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON availableToChat(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.remove("op");
      return OpRegistry.get(CheckChatAvailableOp.class).execute(in);
    });
  }

  @ApiMethod(name = "customerRequest", path = "{ns}/customerRequest", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON customerRequest(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(CustomerRequest.TYPE);
      in.set(FormParams.is_new, true);
      return OpRegistry.get(SaveOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getBrokerInfo", path = "{ns}/getBrokerInfo", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getBrokerInfo(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      // Public field list only; the callers (testimonials pages) read key and is_broker.
      List<HasValues> rows = new Bundle().find(Admin.TYPE)
              .whereEquals(Admin.is_broker, true)
              .toCellData(JSON.empty().set(TableParams.LENGTH, 1), FindLoanOfficerOp.publicProfileFields())
              .getRows();
      return Colls.isEmpty(rows) ? null : rows.get(0);
    });
  }

  @ApiMethod(name = "reviewSummary", path = "{ns}/reviewSummary", httpMethod = ApiMethod.HttpMethod.GET)
  public Object reviewSummary(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      boolean isBroker = in.remove(Admin.is_broker);
      final String key = in.demand(HasKey.key);
      if (isBroker) {
        return OpRegistry.get(ReviewSummaryOp.class).execute(JSON.empty().set(HasKey.key, key));
      } else {
        return OpRegistry.get(AgentReviewsSummaryOp.class).execute(JSON.empty().set(AgentReview.owner, key));
      }
    });
  }

  @ApiMethod(name = "getReviewConfig", path = "{ns}/getReviewConfig", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getReviewConfig(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      final String ownerKey = in.remove(Admin.owner);
      if (Strings.isEmpty(ownerKey)) {
        in.type(ReviewConfig.TYPE);
        in.set(HasId.id, 1L);
      } else {
        in.type(AgentReviewConfig.TYPE);
        in.set(AgentReviewConfig.keyName, ownerKey);
      }
      return OpRegistry.get(GetOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getReviews", path = "{ns}/getReviews", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getReviews(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      String kind = in.get(HasKey.kind);
      if (Strings.isEmpty(kind)) {
        kind = Review.TYPE.name();
      }
      in.set(HasKey.kind, kind);
      in.set(TableParams.COLUMNS, Arrays.asList(Review.created.name(), Review.avatar.name(), Review.reviewer.name(),
              Review.reviewee.name(), Review.rating.name(), Review.source.name(), Review.content.name(), Review.title.name(),
              Review.target.name(), Review.key.name(), Review.reply.name()));
      in.set(TableParams.ORDER, Arrays.asList("-" + Review.created.name()));
      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  @ApiMethod(name = "sendMailToAgent", path = "{ns}/sendMailToAgent", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON sendMailToAgent(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.set(ReferrerInvitationInfo.is_send_text, false);
      in.set(FormParams.is_new, false);
      return JSON.empty().set("status", OpRegistry.get(SendMessageToAdminOp.class).execute(in));
    });
  }

  @ApiMethod(name = "sendTextToAgent", path = "{ns}/sendTextToAgent", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON sendTextToAgent(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.set(ReferrerInvitationInfo.is_send_text, true);
      in.set(FormParams.is_new, false);
      return JSON.empty().set("status", OpRegistry.get(SendMessageToAdminOp.class).execute(in));
    });
  }

  @ApiMethod(name = "getGoogleReviewsByBranch", path = "{ns}/getGoogleReviewsByBranch", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getGoogleReviewsByBranch(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      JSON result = JSON.empty();
      Bundle bundle = new Bundle();
      bundle.readOnly();
      final Long branchId = in.get(Review.branch);
      int length = in.containsKey(TableParams.LENGTH.name()) ? in.get(TableParams.LENGTH) : 10;
      JSON request = JSON.empty().type(Review.TYPE)
              .set(Review.branch, branchId)
              .set(Review.source, ReviewSource.Google)
              .set(Review.rating, 5)
              .set(TableParams.LENGTH, length)
              .set(TableParams.ORDER, Collections.singletonList("-" + Review.created.name()));
      CellData responseReviews = OpRegistry.get(FindOp.class).execute(request);
      final Bean config = bundle.get(ReviewConfig.TYPE, 1L);
      if (config != null && config.hasValue(ReviewConfig.google_locations)) {
        List<HasValues> locations = config.get(ReviewConfig.google_locations)
                .stream()
                .filter(hasValues -> hasValues.is(HasBranch.branch, branchId))
                .toList();
        if (!locations.isEmpty()) {
          result.copyFrom(locations.get(0), ReviewConfig.Location.total_review_count, ReviewConfig.Location.map_url);
        }
      }
      return result.set("reviews", responseReviews);
    });
  }

  @ApiMethod(name = "getLOsByBranch", path = "{ns}/getLOsByBranch", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getLOsByBranch(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      final Long branchId = in.get(Review.branch);
      final int length = in.containsKey(TableParams.LENGTH.name()) ? in.get(TableParams.LENGTH) : 10;
      // Explicit query instead of a generic FindOp over the request parameters: the generic
      // path serialised the whole Admin record (SSN included) and let an anonymous caller filter
      // on any Admin field. Only the filters the public sites send are honoured.
      final QueryBuilder<Bean> query = new Bundle().find(Admin.TYPE)
              .whereEquals(Admin.branch, branchId)
              .whereEquals(Admin.is_loan_originator, true);
      Stream.of(Admin.active, Admin.is_pending_loan_officer).forEach(field -> {
        if (in.hasValue(field)) {
          query.where(in, field);
        }
      });
      in.set(TableParams.LENGTH, length);
      return query.startCursor(in.get(TableParams.CURSOR))
              .orderBy(Admin.created, false)
              .limit(length)
              .toCellData(in, FindLoanOfficerOp.publicProfileFields());
    });
  }

  @ApiMethod(name = "getTeams", path = "{ns}/getTeams", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getTeams(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");

      final Bundle bundle = new Bundle();
      bundle.readOnly();

      String teamKeyName = in.remove(HasKeyName.keyName);
      if (Strings.isNotEmpty(teamKeyName)) {
        final JSON request = JSON.empty().type(Team.TYPE).set(HasKeyName.keyName, teamKeyName);
        request.set(TableParams.ADDL_COLUMNS, Arrays.asList(
                Team.team_leader.dot(Admin.full_name).name(),
                Team.team_leader.dot(Admin.email).name(),
                Team.team_leader.dot(Admin.phone).name(),
                Team.team_leader.dot(Admin.company_email).name(),
                Team.team_leader.dot(Admin.company_phone).name(),
                Team.team_leader.dot(Admin.agent_licenses).name(),
                Team.team_leader.dot(Admin.preferred_languages).name(),
                Team.team_leader.dot(Admin.mortgage_nmls).name(),
                Team.team_leader.dot(Admin.avatar).name()
        ));

        JSON execute = OpRegistry.get(GetOp.class).execute(request);

        List<JSON> teamMembers = bundle.find(Admin.TYPE)
                .whereEquals(Admin.team, teamKeyName)
                .whereEquals(Admin.active, true)
                .list(Admin.full_name, Admin.email, Admin.phone,
                        Admin.active, Admin.avatar, Admin.keyName, Admin.status,
                        Admin.company_email, Admin.company_phone,
                        Admin.agent_licenses, Admin.preferred_languages, Admin.marketplace_online, Admin.live_room_url,
                        Admin.mortgage_nmls, Admin.avg_rate_all_source_review, Admin.total_all_source_review, Admin.is_broker);
        execute.set("team_member", teamMembers);

        return execute;
      } else {
        int length = in.containsKey(TableParams.LENGTH.name()) ? in.get(TableParams.LENGTH) : 10;
        in.type(Team.TYPE);
        in.set(Team.active, true);
        in.set(Team.team_type, Team.TeamType.loan_officer_team);
        in.set(TableParams.COLUMNS, Arrays.asList(HasKeyName.keyName.name(), HasKey.key.name(),
                Team.avatar.name(), Team.name.name(), Team.email.name(),
                Team.members_count.name(), Team.active.name(), Team.description.name(), Team.team_leader.name(),
                Team.team_leader.dot(Admin.full_name).name()));
        in.set(TableParams.ORDER, Arrays.asList("-" + Admin.created.name()));
        in.set(TableParams.LENGTH, length);
        return OpRegistry.get(FindOp.class).execute(in);
      }
    });
  }

  @ApiMethod(name = "getGoogleDriverFolder", path = "{ns}/getGoogleDriverFolder", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getGoogleDriverFolder(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      final String folders = in.getRaw("folders");
      if (Strings.isEmpty(folders)) {
        throw new BadRequestException("Folders can not empty");
      }
      in.set(TableParams.COLUMNS, List.of(folders.split(",")));
      return JSON.empty().set("status", OpRegistry.get("GetGoogleDriveFolderOp").execute(in));
    });
  }

  @ApiMethod(name = "submitLowerRate", path = "{ns}/submitLowerRate", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON submitLowerRate(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(CampaignApplicant.TYPE);
      String loanOfficerKeyName = App.anonymousId(Admin.TYPE);
      if (Strings.isEmpty(loanOfficerKeyName)) {
        Bundle bundle = new Bundle();
        Bean broker = bundle.find(Admin.TYPE).whereEquals(Admin.is_broker, true)
                .whereEquals(Admin.active, true).first();
        loanOfficerKeyName = broker != null ? broker.keyName() : null;
      }
      in.set(CampaignApplicant.loan_officer, loanOfficerKeyName);
      in.set(FormParams.is_new, true);
      return OpRegistry.get(SaveOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getArticleCategories", path = "{ns}/getArticleCategories", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getArticleCategories(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      if (Strings.isNotEmpty(in.key())) {
        Bundle bundle = new Bundle();
        String keyName = bundle.stringToKeyname(in.remove(HasKey.key));
        if (Strings.isNotEmpty(keyName)) {
          in.set(HasKeyName.keyName, keyName);
        }
      }
      List<Bean> execute = OpRegistry.get(AgentArticleCategories.class).execute(in);
      return CellData.fromList(execute.stream().map(element -> JSON.parse(element.toJSONString())).toList());
    });
  }

  @ApiMethod(name = "getArticles", path = "{ns}/getArticles", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getArticles(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      int length = in.containsKey(TableParams.LENGTH.name()) ? in.get(TableParams.LENGTH) : 10;
      in.type(Article.TYPE);
      in.add(TableParams.ADDL_COLUMNS,
              Article.article_author.dot(Admin.full_name).name(),
              Article.article_author.dot(Admin.avatar).name(),
              Article.article_author.dot(Admin.avatar_thumbnail).name()
      );
      String author = in.remove(Article.author);
      if (Strings.isNotEmpty(author)) {
        Bundle bundle = new Bundle();
        String keyName = bundle.stringToKeyname(author);
        if (Strings.isNotEmpty(keyName)) {
          in.set(Article.owners, Colls.asList(keyName));
        }
      } else {
        in.set(Article.created_by_company, true);
      }

      in.set(Article.publish, true);
      in.set(TableParams.ORDER, List.of("-" + Article.created.name()));
      in.set(TableParams.LENGTH, length);
      if (in.containsKey(Article.categories.name())) {
        String categoriesStr = in.getRaw(Article.categories.name());
        if (Strings.isNotEmpty(categoriesStr)) {
          List<Long> categories = Stream.of(categoriesStr.split(",")).map(Long::parseLong).toList();
          in.set(Article.categories, categories);
        }
      }
      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  @ApiMethod(name = "visitorSendEmailToLO", path = "{ns}/visitorSendEmailToLO", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON visitorSendEmailToLO(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.demand(HasKey.key);
      in.demand(HasEmail.email);
      in.set(ReferrerInvitationInfo.is_send_text, false);
      SendMessageToAdminOp sendMessageToAdminOp = OpRegistry.get(SendMessageToAdminOp.class);
      String status = sendMessageToAdminOp.execute(in);
      return JSON.empty().set("status", status);
    });
  }

  @ApiMethod(name = "visitorSendSMSToLO", path = "{ns}/visitorSendSMSToLO", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON visitorSendSMSToLO(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.demand(HasKey.key);
      in.demand(HasPhone.phone);
      in.set(ReferrerInvitationInfo.is_send_text, true);
      String status = OpRegistry.get(SendMessageToAdminOp.class).execute(in);
      return JSON.empty().set("status", status);
    });
  }

  @ApiMethod(name = "getAllStates", path = "{ns}/getAllStates", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getAllStates(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      return JSON.empty().set("states", States.capitalized_states.values());
    });
  }

  @ApiMethod(name = "getSupportedLanguages", path = "{ns}/getSupportedLanguages", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getSupportedLanguages(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      return JSON.empty().set("languages", LanguageLibrary.values());
    });
  }

  @ApiMethod(name = "findCountiesByState", path = "{ns}/findCountiesByState", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON findCountiesByState(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(CountyUS.TYPE);
      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  @ApiMethod(name = "findCitiesByCounty", path = "{ns}/findCitiesByCounty", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON findCitiesByCounty(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(CityUS.TYPE);
      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getCountyAndCityHasLoanOfficer", path = "{ns}/getCountyAndCityHasLoanOfficer", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getCountyAndCityHasLoanOfficer(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      Bundle bundle = new Bundle();
      if (in.containsKey(Admin.preferred_languages.name())) {
        in.set(Admin.preferred_languages, Colls.asList(LanguageLibrary.valueOf(in.getRaw(Admin.preferred_languages.name()))));
      }
      JSON json = (JSON) OpRegistry.get(CountyAndCityHasLoanOfficer.class).execute(in);
      List<Long> counties = json.get(new Field<>("counties", LongType.instance().listType()), new ArrayList<>());
      Set<HasValues> countiesJSON = new HashSet<>();
      Set<HasValues> citiesJSON = new HashSet<>();
      counties.forEach(id -> {
        Bean bean = bundle.get(CountyUS.TYPE, id);
        countiesJSON.add(bean.toJsonMap(CountyUS.id, CountyUS.name));
      });
      if (in.hasValue(Admin.county_id)) {
        List<String> cities = json.get(new Field<>("cities", StringType.instance().listType()), new ArrayList<>());
        citiesJSON.addAll(bundle.find(CityUS.TYPE).whereEquals(CityUS.county, in.get(Admin.county_id)).list().stream().filter(city -> cities.contains(city.get(CityUS.name))).collect(Collectors.toList()));
      }
      json.set("counties", countiesJSON).set("cities", citiesJSON.stream().map(element -> JSON.parse(element.toJSONString())).toList());
      return json;
    });
  }

  @ApiMethod(name = "getAdditionalHours", path = "{ns}/getAdditionalHours", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getAdditionalHours(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      List<HasValues> additionalHours = Server.configuration().get(Configuration.list_additional_hours_required, new ArrayList<>());
      return JSON.empty().set("additionalHours", additionalHours);
    });
  }

  @ApiMethod(name = "getLicenses", path = "{ns}/getLicenses", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getLicenses(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(License.TYPE);
      in.set(TableParams.COLUMNS, Arrays.asList(License.id.name(), License.state_name.name(), License.state.name(),
              License.active.name(), License.type.name(), License.mlo_compensation.name()));
      in.set(TableParams.ORDER, Collections.singletonList(License.state.name()));
      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getNmlsSponsorReport", path = "{ns}/getNmlsSponsorReport", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getNmlsSponsorReport(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(NmlsSponsorReport.TYPE);
      in.set(TableParams.COLUMNS, Arrays.asList(NmlsSponsorReport.state.name(), NmlsSponsorReport.average_time.name(), NmlsSponsorReport.average_time_display.name()));
      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getBestRateCompare", path = "{ns}/getBestRateCompare", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getBestRateCompare(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(BestRateCompare.TYPE);
      if (in.hasValue(BestRateCompare.keyName)) {
        return OpRegistry.get(GetOp.class).execute(in);
      } else {
        in.set(TableParams.ORDER, Collections.singletonList(BestRateCompare.index.name()));
        return OpRegistry.get(FindOp.class).execute(in);
      }
    });
  }

  @ApiMethod(name = "getJobs", path = "{ns}/getJobs", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getJobs(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      if (in.hasValue(HasId.id)) {
        in.set(HasKey.kind, "Job");
        return OpRegistry.get(GetOp.class).execute(in);
      } else {
        return OpRegistry.get("GetJobsByBranches").execute(in);
      }
    });
  }

  @ApiMethod(name = "getJobConfig", path = "{ns}/getJobConfig", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getJobConfig(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.set(HasKey.kind, "JobConfig");
      in.set(HasId.id, 1L);
      return OpRegistry.get(GetOp.class).execute(in);
    });
  }

  @ApiMethod(name = "submitJob", path = "{ns}/submitJob", httpMethod = ApiMethod.HttpMethod.POST)
  public Object submitJob(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.set(HasKey.kind, "Candidate");
      in.set(FormParams.is_new, true);
      return OpRegistry.get(SaveOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getTodayRate", path = "{ns}/getTodayRate", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getTodayRate(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      JSON result = JSON.empty();
      Bundle bundle = new Bundle();
      HasValues subscriptionConfig = bundle.get(SubscriptionConfig.TYPE, "visitor_rates_update_email");
      HasValues crmSubscriptionType = bundle.get(CRMSubscriptionType.TYPE, "visitor_rates_update_email");
      CellData execute = OpRegistry.get(FindOp.class).execute(JSON.empty().type(CRMBestRateHistory.TYPE).set(CRMBestRateHistory.is_live, true).set(TableParams.LENGTH, 1));
      HasValues rateHistory = execute.getRows().isEmpty() ? null : execute.getRows().get(0);
      return result.set("rateHistory", rateHistory).set("subscriptionConfig", JSON.parse(subscriptionConfig.toJSONString())).set("crmSubscriptionType", JSON.parse(crmSubscriptionType.toJSONString()));
    });
  }

  @ApiMethod(name = "getTodayRateData", path = "{ns}/getTodayRateData", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getTodayRateData(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      CellData live = OpRegistry.get(FindOp.class).execute(JSON.empty().type(CRMBestRateHistory.TYPE)
              .set(CRMBestRateHistory.is_live, true).set(TableParams.LENGTH, 1));
      if (live.getRows().isEmpty()) {
        throw new IllegalStateException("No live CRMBestRateHistory found");
      }
      HasValues rateHistory = live.getRows().get(0);
      HasValues config = new Bundle().get(SubscriptionConfig.TYPE, CRMSubscriptionType.SUB_VISITOR_RATES_UPDATE_EMAIL);
      JSON result = JSON.empty();
      result.set("updated", rateHistory.get(HasKey.created))
              .set("updatedDisplay", rateHistory.display(HasKey.created))
              .set("qmLender", rateHistory.get(CRMBestRateHistory.lender));
      boolean showQm = true;
      boolean showNonQm = true;
      if (config != null) {
        showQm = config.is(SubscriptionConfig.show_qm_rates_on_landing_page);
        showNonQm = config.is(SubscriptionConfig.show_non_qm_rates_on_landing_page);
        result.set("extraMessage", showNonQm && config.is(SubscriptionConfig.add_extra_message)
                ? config.get(SubscriptionConfig.extra_message, "") : "");
      }
      return result.set("programs", withoutHiddenPrograms(getPrograms(rateHistory, config), showQm, showNonQm));
    });
  }

  /**
   * The landing page shows only the programs that carry a rate, so a group the company switched off is answered
   * with an empty object per program. The keys stay, otherwise an empty "programs" makes the page fall back to
   * the legacy getTodayRate answer, which carries every rate.
   */
  private static JSON withoutHiddenPrograms(JSON programs, boolean showQm, boolean showNonQm) {
    if (!showQm) {
      QM_PROGRAM_KEYS.forEach(key -> programs.set(key, JSON.empty()));
    }

    if (!showNonQm) {
      NON_QM_PROGRAM_KEYS.forEach(key -> programs.set(key, JSON.empty()));
    }

    return programs;
  }

  private static JSON getPrograms(HasValues rateHistory, HasValues config) {
    return JSON.empty()
            .set("primary", todayRateProgram(rateHistory, config, CRMBestRateHistory.primary_rate,
                    CRMBestRateHistory.primary_apr, null, HasSubscriptionConfigParams.primary_quote_params))
            .set("second_home", todayRateProgram(rateHistory, config, CRMBestRateHistory.second_home_rate,
                    CRMBestRateHistory.second_home_apr, null, HasSubscriptionConfigParams.second_home_quote_params))
            .set("investment", todayRateProgram(rateHistory, config, CRMBestRateHistory.investment_rate,
                    CRMBestRateHistory.investment_apr, null, HasSubscriptionConfigParams.investment_quote_params))
            .set("fha", todayRateProgram(rateHistory, config, CRMBestRateHistory.fha_rate,
                    CRMBestRateHistory.fha_apr, null, HasSubscriptionConfigParams.fha_home_quote_params))
            .set("va", todayRateProgram(rateHistory, config, CRMBestRateHistory.va_rate,
                    CRMBestRateHistory.va_apr, null, HasSubscriptionConfigParams.va_home_quote_params))
            .set("no_employment", todayRateProgram(rateHistory, config,
                    CRMBestRateHistory.no_docs_30_year_fixed_rate, CRMBestRateHistory.no_docs_30_year_fixed_apr,
                    CRMBestRateHistory.no_docs_30_year_fixed_best_lender,
                    HasSubscriptionConfigParams.no_docs_30_year_fixed_quote_params))
            .set("bank_statement", todayRateProgram(rateHistory, config, CRMBestRateHistory.bank_statement_rate,
                    CRMBestRateHistory.bank_statement_apr, CRMBestRateHistory.bank_statement_best_lender,
                    HasSubscriptionConfigParams.bank_statements_quote_params))
            .set("dscr_investment", todayRateProgram(rateHistory, config, CRMBestRateHistory.dscr_investment_rate,
                    CRMBestRateHistory.dscr_investment_apr, CRMBestRateHistory.dscr_investment_best_lender,
                    HasSubscriptionConfigParams.dscr_investment_quote_params))
            .set("foreign_national", todayRateProgram(rateHistory, config,
                    CRMBestRateHistory.foreign_national_rate, CRMBestRateHistory.foreign_national_apr,
                    CRMBestRateHistory.foreign_national_best_lender,
                    HasSubscriptionConfigParams.foreign_national_quote_params));
  }

  private static JSON todayRateProgram(HasValues rateHistory, HasValues config, Field<Double> rateField,
                                       Field<Double> aprField, Field<LenderType> bestLenderField, Field<HasValues> quoteParamsField) {
    JSON program = JSON.empty();
    if (rateHistory.hasValue(rateField)) {
      program.set("rate", rateHistory.get(rateField));
    }
    if (rateHistory.hasValue(aprField)) {
      program.set("apr", rateHistory.get(aprField));
    }
    if (bestLenderField != null && rateHistory.hasValue(bestLenderField)) {
      program.set("bestLender", rateHistory.display(bestLenderField));
    }
    HasValues quoteParams = config == null ? null : config.get(quoteParamsField);
    if (quoteParams != null) {
      boolean nonQM = bestLenderField != null;
      if (!nonQM) {
        LoanQuoteUtils.enforceQuoteParamsCategory(quoteParamsField, quoteParams);
      }
      JSON params = JSON.parse(quoteParams.toJSONString());
      if (nonQM) {
        MosoPricingAPI.enrichNonQMAlertInput(params);
      } else {
        MosoPricingAPI.enrichAlertInput(params);
      }
      program.set("quoteParams", params);
      program.set("quoteUrl", todayRateQuoteUrl(params, nonQM));
    }
    return program;
  }

  private static String todayRateQuoteUrl(HasValues quoteParams, boolean nonQM) {
    Field<?>[] baseFields = nonQM ? Loan.NON_QM_QUOTE_FIELDS : Loan.QUOTE_FIELDS;
    Field<?>[] fields = Colls.concatToArray(baseFields, new Field[]{Loan.loan_program_group});
    QuoteSection section = nonQM ? QuoteSection.non_qm_quote_result : QuoteSection.quote_result;
    return Server.baseUrl() + "/" + section.name() + "?" + Format.format.createUrl(quoteParams, fields);
  }

  @ApiMethod(name = "registerRate", path = "{ns}/registerRate", httpMethod = ApiMethod.HttpMethod.POST)
  public Object registerRate(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(CRMSubscriptionContact.TYPE);
      return OpRegistry.get(ClientRegisterSubscriptionListOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getBestRateChart", path = "{ns}/getBestRateChart", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getBestRateChart(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(BestRateChartRecord.TYPE);
      in.set(TableParams.ORDER, Collections.singletonList(BestRateChartRecord.date.name()));
      in.set(TableParams.COLUMNS, Arrays.asList(BestRateChartRecord.date.name(), BestRateChartRecord.infos.name()));
      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getBestRateConfig", path = "{ns}/getBestRateConfig", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getBestRateConfig(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.demand(Loan.purpose);
      in.demand(Loan.loan_type);
      return JSON.parse(LoanQuoteUtils.ensureDefaultBestRateConfig(in.get(Loan.purpose), in.get(Loan.loan_type)).toJSONString());
    });
  }

  @ApiMethod(name = "getMediaTypes", path = "{ns}/getMediaTypes", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getMediaTypes(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.set(TableParams.COLUMNS, Arrays.asList(MediaType.id.name(), MediaType.name.name(), MediaType.visibility.name()));
      in.type(MediaType.TYPE);
      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getLoanTypes", path = "{ns}/getLoanTypes", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getLoanTypes(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return Arrays.stream(PropertyType.values())
              .map(propertyType -> {
                Map<String, Object> map = new HashMap<>();
                map.put("name", propertyType.name());
                map.put("unit", propertyType.unit());
                map.put("label", propertyType.toString());
                return map;
              })
              .collect(Collectors.toList());

    });
  }

  @ApiMethod(name = "getLoanPrograms", path = "{ns}/getLoanPrograms", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getLoanPrograms(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return LoanProgram.SORTED_PROGRAMS;
    });
  }

  @ApiMethod(name = "submitHeloc", path = "{ns}/submitHeloc", httpMethod = ApiMethod.HttpMethod.POST)
  public Object submitHeloc(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(Loan.TYPE);
      return OpRegistry.get(SaveLeadFunnelOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getCorporateDiscountConfig", path = "{ns}/getCorporateDiscountConfig", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getCorporateDiscountConfig(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(CorporateDiscountConfiguration.TYPE);
      in.set(HasId.id, CorporateDiscountConfiguration.DEFAULT_ID);
      return OpRegistry.get(GetOp.class).execute(in);
    });
  }

  @ApiMethod(name = "submitCorporateDiscount", path = "{ns}/submitCorporateDiscount", httpMethod = ApiMethod.HttpMethod.POST)
  public Object submitCorporateDiscount(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(LFCorporateDiscountProgram.TYPE);
      return OpRegistry.get(SaveOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getAppreciationSetting", path = "{ns}/getAppreciationSetting", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getAppreciationSetting(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(AppreciationSetting.TYPE);
      in.set(HasId.id, CorporateDiscountConfiguration.DEFAULT_ID);
      return OpRegistry.get(GetOp.class).execute(in);
    });
  }

  @ApiMethod(name = "submitReferALoanOfficer", path = "{ns}/submitReferALoanOfficer", httpMethod = ApiMethod.HttpMethod.POST)
  public Object submitReferALoanOfficer(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.set(LORecruiting.referred_source, LoanOfficerReferredSource.outside_loan_officer);
      // The endpoint stamps its own origin; a client-posted lead_origin / owner field is discarded.
      LeadOriginStamp.forceReferLoPage(in);
      stripCreditFields(in);
      MortgageWebsiteDisclosure.stripFromBody(in);
      return LeadOriginStamp.stripFromResponse(OpRegistry.get(SaveLORecruiterOp.class).execute(in));
    });
  }

  @ApiMethod(name = "submitReferABorrower", path = "{ns}/submitReferABorrower", httpMethod = ApiMethod.HttpMethod.POST)
  public Object submitReferABorrower(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      final String sendType = in.remove("type");
      if (Strings.isEmpty(sendType)) {
        throw new BadRequestException("Type is required");
      }
      if (!sendType.equals("EMAIL") && !sendType.equals("TEXT_MESSAGE")) {
        throw new BadRequestException("Type must be EMAIL or TEXT_MESSAGE");
      }
      in.set(ReferralTracking.send_type, sendType.equals("EMAIL") ? ReferralTracking.SEND_EMAIL : ReferralTracking.SEND_TEXT_MESSAGE);
      OpRegistry.get(SaveReferralTrackingOp.class).execute(in);
      return JSON.empty().set("status", "success");
    });
  }

  @ApiMethod(name = "mortgageCalculator", path = "{ns}/mortgageCalculator", httpMethod = ApiMethod.HttpMethod.POST)
  public Object mortgageCalculator(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      return new MortgageCalculatorOp().execute(in);
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  @ApiMethod(name = "registerLoanOfficer", path = "{ns}/registerLoanOfficer", httpMethod = ApiMethod.HttpMethod.POST)
  public Object registerLoanOfficer(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      stripMeetingStatus(in);
      stripFeeAndAgreementFields(in);
      stripCreditFields(in);
      final String key = in.get(LORecruiting.key);
      if (Strings.isEmpty(key)) {
        // The disclosure guard runs inside RegisterInterestedLoanOfficer, against the row it dedupes onto.
        return withoutSigningLink(LeadOriginStamp.stripFromResponse(OpRegistry.get(RegisterInterestedLoanOfficer.class).execute(in)));
      } else {
        // agentflow-qo5my: this branch is a plain SaveOp, not RegisterInterestedLoanOfficer, so the
        // fill-only-when-empty guard on legal_given_name/legal_last_name has to be applied here too
        // — a resubmission of this public form with a known key must never erase or replace a legal
        // name the recruiter already confirmed at the onboarding meeting.
        Bean existing = new Bundle().get(key);
        // agentflow-7mwf0: this branch is a plain SaveOp over the raw public body, so it would write any
        // LORecruiting field the body names — agreement_flow included. Only RecruitAPI may stamp it.
        RegisterInterestedLoanOfficer.protectAgreementFlow(in);
        MortgageWebsiteDisclosure.validateAndSanitize(in, existing);
        RegisterInterestedLoanOfficer.protectLegalNames(in, existing);
        // agentflow-0vfb3: and the W-2/1099 the specialist chose at the 1-1 must survive the form's re-saves.
        RegisterInterestedLoanOfficer.protectMeetingClassification(in, existing);
        if (existing != null) {
          // agentflow-2zm7s: same for attribution. This branch bypasses RegisterInterestedLoanOfficer, so
          // without this an unauthenticated body carrying a known key could restate referred_source /
          // referred_by (and the create-only origin stamp) on an existing row. First touch wins, but a
          // row with no attribution yet may still receive it (multi-step /register-loan-officer forms).
          RegisterInterestedLoanOfficer.keepFirstTouchAttributionUnlessEmpty(in, existing);
        } else {
          // Unknown key: nothing to protect, and SaveOp may CREATE the row, so this is a first touch.
          // Attribution passes through as on the unkeyed path; the client may only name the origin.
          LeadOriginStamp.acceptClientOrigin(in);
        }
        return withoutSigningLink(LeadOriginStamp.stripFromResponse(OpRegistry.get(SaveOp.class).execute(in)));
      }
    });
  }

  /**
   * agentflow-ce3ey: the 1-1 call unlocks the signing link (RegisterLoanOfficerProfile.isSigningUnlocked), so
   * no public body may record it; only MOSO staff (the op directly) and RecruitAPI do. The pages never send it.
   */
  static void stripMeetingStatus(JSON in) {
    in.remove(LORecruiting.onboarding_meeting_status.name());
  }

  /**
   * agentflow-9wg8r: registerLoanOfficer (keyed and unkeyed) and registerWebinar persist the request body, so
   * without this any caller holding an e-mail or a row key could mark the startup fee paid or waived and flag
   * the agreement signed. The fee is marked paid only by a verified PayPal capture
   * ({@link #saveLoanOfficerPaidStartupFee}), waived only by MOSO staff or RecruitAPI, and
   * {@code lo_agreement_signed} is set server-side by the e-sign completion path; the pages never send any of
   * these. Applied here and not in RegisterInterestedLoanOfficer, which staff also reach over authenticated RPC.
   */
  /**
   * Recruiter credit is decided by the server ({@code LORecruiting.beforeCreated}: the HR-flag rule, or
   * {@code LoRecruiterProgramStanding}), never by a public body. A client-sent {@code recruiter} would put any
   * Loan Officer on the credit/pay reports, and a client-sent {@code referred_lo} would forge a referral. Staff
   * and internal saves reach {@code RegisterInterestedLoanOfficer} directly and are not touched. The program-credit
   * marker is part of the origin stamp, which {@code LeadOriginStamp} already strips on every public path.
   */
  static void stripCreditFields(JSON in) {
    in.remove(LORecruiting.recruiter.name());
    in.remove(LORecruiting.referred_lo.name());
  }

  static void stripFeeAndAgreementFields(JSON in) {
    in.remove(LORecruiting.paid_startup_fee.name());
    in.remove(LORecruiting.waive_startup_fee.name());
    in.remove(LORecruiting.waive_startup_fee_reason.name());
    in.remove(LORecruiting.paypal_order_id.name());
    in.remove(LORecruiting.lo_agreement_signed.name());
  }

  /**
   * agentflow-ce3ey: a save answer never carries the signing link. The page reads only {@code key} and
   * {@code error} from it, and getRegisterLoanOfficer serves the link once the 1-1 call is recorded.
   */
  static Object withoutSigningLink(Object response) {
    if (response instanceof JSON json) {
      json.remove(LORecruiting.url_signing_sessions.name());
    } else if (response instanceof java.util.Map<?, ?> map) {
      map.remove(LORecruiting.url_signing_sessions.name());
    }
    return response;
  }

  @ApiMethod(name = "registerSigningAgreement", path = "{ns}/registerSigningAgreement", httpMethod = ApiMethod.HttpMethod.POST)
  public Object registerSigningAgreement(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.demand(LORecruiting.key);
      // agentflow-90vkj: this body is unauthenticated, and the op honours force_regenerate (cancel the
      // live envelope, send a new billable one) and template (send an e-mail). The loan officer's own
      // page never sends either; only MOSO's internal callers may.
      EnsureSigningSessionsRegisterInterestedLoanOfficer.stripInternalFlags(in);
      // agentflow-ce3ey: no envelope before the 1-1 call. A built envelope is signable by whoever holds
      // its link, whatever the page shows, so the page's lock alone let loan officers sign first.
      // LORecruiting.afterSave builds it when the call is recorded; the page asks again at the sign step.
      final String key = in.get(LORecruiting.key);
      final Bean row = new Bundle().get(key);
      if (!RegisterLoanOfficerProfile.isSigningUnlocked(row)) {
        return JSON.empty().key(key);
      }
      final JSON built = ensureSigningAgreement(in);
      // After the call the envelope may be built (afterSave builds it too), but the page signs only once
      // nothing is left to pay, so the link waits for that.
      return RegisterLoanOfficerProfile.isSigningLinkServable(row) ? built : (JSON) withoutSigningLink(built);
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  /** Runs the e-sign op for {@link #registerSigningAgreement}; its own method so a test can see exactly
   * which input the op receives from a public body. */
  protected JSON ensureSigningAgreement(JSON input) throws Exception {
    return OpRegistry.get(EnsureSigningSessionsRegisterInterestedLoanOfficer.class).execute(input);
  }

  @ApiMethod(name = "saveLoanOfficerPaidStartupFee", path = "{ns}/saveLoanOfficerPaidStartupFee", httpMethod = ApiMethod.HttpMethod.POST)
  public Object saveLoanOfficerPaidStartupFee(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.demand(LORecruiting.key);
      return OpRegistry.get(InterestedLoanOfficerPaidStartupFee.class).execute(in);
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  @ApiMethod(name = "validateAvailableAccount", path = "{ns}/validateAvailableAccount", httpMethod = ApiMethod.HttpMethod.POST)
  public Object validateAvailableAccount(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.demand(HasEmail.email);
      in.type(Client.TYPE);
      return OpRegistry.get(CheckAvailableProfileWithCredentialOp.class).execute(in);
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  @ApiMethod(name = "registerClient", path = "{ns}/registerClient", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON registerClient(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      return OpRegistry.get(RegisterClientOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getQuoteConfiguration", path = "{ns}/getQuoteConfiguration", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getQuoteConfiguration(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      final String agentEmail = in.remove("agent_email");
      if (Strings.isNotEmpty(agentEmail)) {
        beforeRequest(req, ns, agentEmail);
      } else {
        beforeRequest(req, ns);
      }
      return (JSON) OpRegistry.get(GetQuoteConfigWithAliases.class).execute(in.type(QuoteConfiguration.TYPE).set(QuoteConfiguration.id, Long.valueOf(ns)));
    });
  }

  @ApiMethod(name = "getCountyLimit", path = "{ns}/getCountyLimit/{zip}", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getCountyLimit(HttpServletRequest req, @Named("ns") String ns, @Named("zip") String zip, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return OpRegistry.get(GetCountyLimits.class).execute(in.set(ZipCode.id, Long.valueOf(zip)));
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  @ApiMethod(name = "getRates", path = "{ns}/getRates", httpMethod = ApiMethod.HttpMethod.POST)
  public CellData getRates(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      final ProgramFilterGroup programFilterGroup = in.get(Quote.loan_program_group);
      if (!ProgramFilterGroup.FEATURE.equals(programFilterGroup)) {
        return getRates(in);
      } else {
        final List<HasValues> result = new ArrayList<>();
        final List<String> programGroupsActiveStr = in.getRaw("loan_program_groups_active");
        for (String filterGroupStr : programGroupsActiveStr) {
          final JSON requestRate = JSON.empty().copyFrom(in).set(Quote.loan_program_group, ProgramFilterGroup.valueOf(filterGroupStr));
          final CellData rateResults = getRates(requestRate);
          final List<HasValues> rates = markBestRate(rateResults.getRows());
          final HasValues bestRate = bestRate(rates);
          final List<HasValues> bestRateGroup = rates.stream().filter(rate -> rate.isEquals(bestRate, Rate.interest_rate)).toList();
          result.addAll(bestRateGroup);
        }
        return CellData.fromList(result);
      }
    });
  }

  private List<HasValues> markBestRate(final List<HasValues> rates) {
    if (Colls.isEmpty(rates)) {
      return Collections.emptyList();
    }

    final List<HasValues> groupedRates = new ArrayList<>();
    final Map<String, List<HasValues>> groupByInterestRate = rates.stream()
            .collect(Collectors.groupingBy(rate -> rate.display(Quote.loan_program_group) + rate.get(Rate.interest_rate)));


    for (List<HasValues> ratesPerInterestRate : groupByInterestRate.values()) {
      HasValues bestRate = ratesPerInterestRate.get(0);
      bestRate.add(HasLabels.labels, "best_lender");
      groupedRates.addAll(ratesPerInterestRate);
    }
    return groupedRates;
  }

  private HasValues bestRate(final List<HasValues> rates) {
    final List<HasValues> sortedRates = rates.stream().filter(element -> element.has(HasLabels.labels, BEST_LENDER))
            .sorted(Comparator.comparingDouble(o -> o.get(Rate.total_cost))).toList();

    return sortedRates.stream().filter(rate -> rate.get(Rate.total_cost) > 0).findFirst()
            .orElse(sortedRates.get(sortedRates.size() - 1));
  }

  @ApiMethod(name = "generateClosingCostsFee", path = "{ns}/generateClosingCostsFee", httpMethod = ApiMethod.HttpMethod.POST)
  public Object generateClosingCostsFee(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      return OpRegistry.get(GenerateClosingCostsFeeOps.class).execute(in);
    });
  }

  @ApiMethod(name = "generatePayment", path = "{ns}/generatePayment", httpMethod = ApiMethod.HttpMethod.POST)
  public Object generatePayment(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      return OpRegistry.get(GeneratePaymentOp.class).execute(in);
    });
  }

  @ApiMethod(name = "generateRatePDF", path = "{ns}/generateRatePDF", httpMethod = ApiMethod.HttpMethod.POST)
  public Object generateRatePDF(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(MarketingMaterials.TYPE);
      return OpRegistry.get(GetRateDataToGeneratePDFOp.class).execute(in);
    });
  }

  @ApiMethod(name = "copyLinkQuoteForm", path = "{ns}/copyLinkQuoteForm", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON copyLinkQuoteForm(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return copyQuoteQM(in, null);
    });
  }

  @ApiMethod(name = "copyLinkNonQMQuoteForm", path = "{ns}/copyLinkNonQMQuoteForm", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON copyLinkNonQMQuoteForm(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return copyQuoteNonQM(in, null);
    });
  }

  @ApiMethod(name = "shareQuote", path = "{ns}/shareQuote", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON shareQuote(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      OpRegistry.get(SaveReferralTrackingOp.class).execute(in);
      OpRegistry.get(DeleteOptOutRequestOp.class).execute(JSON.empty().type(OptOutRequest.TYPE).set("ns", in.get(Template.additional_recipients)));
      return JSON.empty().set("status", "success");
    });
  }

  @ApiMethod(name = "questionQuote", path = "{ns}/questionQuote", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON questionQuote(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      return OpRegistry.get(SaveLeadOp.class).execute(in);
    });
  }

  @ApiMethod(name = "submitLoanProduct", path = "{ns}/submitLoanProduct", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON submitLoanProduct(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.set(FormParams.is_new, true);
      in.type(Loan.TYPE);
      JSON result = OpRegistry.get(SaveLeadOp.class).execute(in);
      return result;
    });
  }

  @ApiMethod(name = "createAlert", path = "{ns}/createAlert", httpMethod = ApiMethod.HttpMethod.POST)
  public JSON createAlert(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      final String agentEmail = input.remove("agent_email");
      if (Strings.isNotEmpty(agentEmail)) {
        beforeRequest(req, ns, agentEmail);
      } else {
        beforeRequest(req, ns, extractLOEmail(input));
      }
      return createAlert(in);
    });
  }

  @ApiMethod(name = "updateAlert", path = "{ns}/updateAlert", httpMethod = ApiMethod.HttpMethod.POST)
  public Object updateAlert(HttpServletRequest req, @Named("ns") String ns, JSON in) throws ServiceException {
    return handleRequest(in, input -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      return OpRegistry.get(UpdateAlertOp.class).execute(input);
    });
  }

  @ApiMethod(name = "getNonQMRates", path = "{ns}/getNonQMRates", httpMethod = ApiMethod.HttpMethod.POST)
  public Object getNonQMRates(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      return getNonQMRates(req, in);
    });
  }

  @ApiMethod(name = "findLenders", path = "{ns}/findLenders", httpMethod = ApiMethod.HttpMethod.POST)
  public Object findLenders(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      final HasValues currentUser = beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      final String lenderDetail = in.remove("lender_detail");
      if (Strings.isNotEmpty(lenderDetail)) {
        final JSON requestLenderDetail = JSON.empty().type(Lender.TYPE).set(HasId.id, Long.parseLong(lenderDetail));
        JSON lender = OpRegistry.get(GetOp.class).execute(requestLenderDetail);
        JSON requestLenderAgreement = JSON.empty().type(LenderAgreement.TYPE).set(LenderAgreement.id, Long.parseLong(lenderDetail));
        JSON lenderAgreement = OpRegistry.get(GetOp.class).execute(requestLenderAgreement);
        if (!isPubliclyListed(lenderAgreement)) {
          throw new NotFoundException("Lender not found");
        }
        Consumer<HasValues> addInternalReviewFn = FindVendorContactsOp.addInternalReviewFn(LenderAgreement.TYPE, List.of(lenderAgreement.key()));
        addInternalReviewFn.accept(lenderAgreement);
        // Reuse the same cache FindLenderAgreementsOp's list view already reads for this field,
        // instead of re-running this exact count query, uncached, on every /our-lenders/{slug}
        // request. Deliberate tradeoff: this cache has NO TTL - its only invalidation is
        // Loan#afterSave firing when a loan's `closed` flag changes for lenderId. Reassigning a
        // closed loan to a different lender, or deleting one, does not correct either lender's
        // cached count. That staleness already exists today for the list view; this just makes
        // the detail page agree with it instead of running its own always-fresh-but-uncached query.
        int totalLoansClosed = LenderAgreement.getTotalLoansClosed(lender.id(), false);
        Bundle bundle = new Bundle();
        int totalLoansClosed12Month = bundle.find(Loan.TYPE)
                .whereEquals(Loan.lender_id, lender.id())
                .whereEquals(Loan.closed, true)
                .where(Loan.closing_date, CompareType.LESS_THAN_OR_EQUAL, new Date())
                .where(Loan.closing_date, CompareType.LESS_THAN_OR_EQUAL, Dates.dates.addMonths(new Date(), -12))
                .count(MAX_QUERY);
        return lender
                .set(Reaction.liked, lenderAgreement.get(Reaction.liked))
                .set(Reaction.disliked, lenderAgreement.get(Reaction.disliked))
                .set(InternalReview.reviewed, lenderAgreement.get(InternalReview.reviewed))
                .set("total_loans_closed", totalLoansClosed)
                .set("total_loans_colosed_12_month", totalLoansClosed12Month);
      }
      // Anonymous list requests come from the LO homepage server, about 15k an hour, and repeat
      // within minutes. Each heavy one loads ~1000 lender agreements (3-6 s), so the visible rows
      // are cached briefly: 5 minutes, or 1 minute when the rows carry live/weekend online counts.
      // Callers with a login (header or session) and lender detail are never cached, because the
      // reaction flags in the rows are per user.
      final boolean anonymous = currentUser == null && Server.currentUser() == null;
      final String cacheKey = anonymous ? findLendersCacheKey(ns, in) : null;
      final int cacheSeconds = Boolean.TRUE.equals(in.get(LenderAgreement.with_rating))
              ? FIND_LENDERS_LIVE_CACHE_SECONDS : FIND_LENDERS_CACHE_SECONDS;
      if (cacheKey != null) {
        final CellData cached = Server.cache().get(cacheKey);
        if (cached != null) {
          return cached;
        }
      }
      final CellData result = findLenderList(in);
      if (cacheKey != null) {
        try {
          Server.cache().put(Server.namespace(), cacheKey, result, cacheSeconds);
        } catch (Exception e) {
          LOG.warning("findLenders result not cached: " + e);
        }
      }
      return result;
    });
  }

  static final int FIND_LENDERS_CACHE_SECONDS = 300;
  static final int FIND_LENDERS_LIVE_CACHE_SECONDS = 60;

  private static String findLendersCacheKey(String ns, JSON in) {
    try {
      final byte[] hash = java.security.MessageDigest.getInstance("SHA-256")
              .digest((ns + "|" + Server.currentUrl() + "|" + in.toJSONString()).getBytes(StandardCharsets.UTF_8));
      return "find_lenders_v1_" + java.util.HexFormat.of().formatHex(hash);
    } catch (Exception e) {
      return null;
    }
  }

  private static CellData findLenderList(JSON in) throws Exception {
    final Boolean allLender = in.remove("all_lender");
    if (allLender != null) {
      JSON requestAll = JSON.empty();
      requestAll.type(LenderAgreement.TYPE);
      requestAll.set(TableParams.LENGTH, in.get(TableParams.LENGTH));
      requestAll.set(TableParams.COLUMNS, Arrays.asList(
              LenderAgreement.id.name(), LenderAgreement.is_correspondent.name(), LenderAgreement.is_approved.name(),
              LenderAgreement.lender.dot(Lender.name).name(),
              LenderAgreement.lender.dot(Lender.licensed_states).name(),
              LenderAgreement.show_on_public_site.name()));
      CellData allLendersResult = OpRegistry.get(FindOp.class).execute(requestAll);
      List<HasValues> visibleLenders = allLendersResult.getRows().stream()
              .filter(row -> isPubliclyListed(row))
              .collect(Collectors.toList());
      return CellData.fromList(visibleLenders);
    }
    in.set(TableParams.COLUMNS, Arrays.asList(LenderAgreement.logo.name(),
            LenderAgreement.lender.dot(Lender.name).name(), LenderAgreement.is_correspondent.name(), LenderAgreement.is_approved.name(),
            LenderAgreement.is_paid_for_va_sponsorship.name(), LenderAgreement.lender.dot(Lender.tbd_underwriting).name(),
            LenderAgreement.lender.dot(Lender.key).name(), LenderAgreement.lender.dot(Lender.overlays_requirement).name(),
            LenderAgreement.expiration_date.name(), LenderAgreement.lender.dot(Lender.primary_loan_types).name(),
            LenderAgreement.days_to_clear_to_close.name(), LenderAgreement.alias.name(), LenderAgreement.lender.dot(Lender.lender_niche).name(),
            LenderAgreement.support_as_referral_lender.name(), LenderAgreement.approval_date.name(), LenderAgreement.expiration_date.name(),
            LenderAgreement.account_created_by.name(), LenderAgreement.child_lender_folder.name(), LenderAgreement.folder_name.name(),
            LenderAgreement.lender_folder.name(), LenderAgreement.va_sponsorship_tag.name(),
            LenderAgreement.show_on_public_site.name()));
    CellData lenderAgreements = findLenderAgreements(in);
    List<HasValues> visibleLenderAgreements = lenderAgreements.getRows().stream()
            .filter(WebPlusAPI::isPubliclyListed)
            .collect(Collectors.toList());
    return CellData.fromList(visibleLenderAgreements);
  }

  @ApiMethod(name = "getLenderContacts", path = "{ns}/getLenderContacts", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getLenderContacts(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(LenderContact.TYPE);
      in.demand(LenderContact.lender_agreement);
      return OpRegistry.get(FindLenderContactsOp.class).execute(in);
    });
  }

  @ApiMethod(name = "findLenderDPAPrograms", path = "{ns}/findLenderDPAPrograms", httpMethod = ApiMethod.HttpMethod.POST)
  public Object findLenderDPAPrograms(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.set(TableParams.COLUMNS, Arrays.asList(LenderAgreement.logo.name(), LenderAgreement.id.name(),
              LenderAgreement.lender.dot(Lender.name).name(), LenderAgreement.lender_name.name(),
              LenderAgreement.dba_programs.name()));
      return OpRegistry.get(FindLenderDPAProgramsOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getLenderReviews", path = "{ns}/getLenderReviews", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getLenderReviews(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(InternalReview.TYPE);
      in.demand(InternalReview.container);
      String sort = in.getRaw("sort");
      if (Strings.isNotEmpty(sort)) {
        in.set(TableParams.ORDER, List.of(sort));
      }
      in.set(TableParams.COLUMNS, Arrays.asList(InternalReview.author.dot(User.avatar).name(),
              InternalReview.author.dot(User.full_name).name(),
              InternalReview.updated.name(), InternalReview.key.name(), InternalReview.review_labels.name(),
              InternalReview.rate.name(), InternalReview.feedback.name()));
      CellData result = OpRegistry.get(FindOp.class).execute(in);
      JSON reviews = OpRegistry.get(InternalReviewStatisticOp.class).execute(in.set("is_all_reviews_statistic", Boolean.FALSE));
      return result.set("reviews", reviews);
    });
  }

  @ApiMethod(name = "getParseRates", path = "{ns}/getParseRates", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getParseRates(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(ParseRateInfo.TYPE);
      in.set(TableParams.COLUMNS, Arrays.asList(ParseRateInfo.rates.name(), ParseRateInfo.key.name()));
      in.demand(ParseRateInfo.keyName);
      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getLenderDocs", path = "{ns}/getLenderDocs", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getLenderDocs(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(HasEmail.TYPE);
      in.demand(FileParams.parent);
      in.demand(FileParams.root);
      in.set(FileParams.find_exact_name, Boolean.FALSE);
      in.set(TableParams.ORDER, Arrays.asList(FileParams.name.name(), "-" + FileParams.modified_date.name()));
      in.set(TableParams.COLUMNS, Arrays.asList(FileParams.name.name(), FileParams.size.name(),
              FileParams.modified_date.name(), FileParams.type.name(), FileParams.id.name()));
      return OpRegistry.get(GetFilesOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getLoginHistories", path = "{ns}/getLoginHistories", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getLoginHistories(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(AuthenticationHistory.TYPE);
      in.set(TableParams.ORDER, List.of("-" + AuthenticationHistory.created.name()));
      in.set(TableParams.COLUMNS, Arrays.asList(
              AuthenticationHistory.container.dot(User.avatar_thumbnail).name(),
              AuthenticationHistory.container.dot(User.full_name).name(),
              AuthenticationHistory.user_kind.name(),
              AuthenticationHistory.type.name(),
              AuthenticationHistory.type_and_via.name(),
              AuthenticationHistory.created.name(),
              AuthenticationHistory.client_public_ip.name(),
              AuthenticationHistory.login_via.name(),
              AuthenticationHistory.detail_information.name(),
              AuthenticationHistory.session_age_in_mils.name(),
              AuthenticationHistory.request_identify.name(),
              AuthenticationHistory.key.name()));
      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getMaxDTI", path = "{ns}/getMaxDTI", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON getMaxDTI(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      Boolean isJumbo = in.is(Quote.loan_type, LoanType.Jumbo);
      LoanType loanType = in.get(Loan.loan_type);
      HasValues dtiSetting = new Bundle().get(MaxDTISetting.TYPE, 1L);
      JSON result = JSON.empty().set("is_jumbo", isJumbo).set(Qualification.max_dti, QualificationUtil.getMaxDTI(isJumbo, loanType, dtiSetting));
      Double maxFrontEndDTI = QualificationUtil.getMaxFrontEndDTI(isJumbo, loanType, dtiSetting);
      if (maxFrontEndDTI != null) {
        result.set("max_front_end_dti", maxFrontEndDTI);
      }
      return result;
    });
  }

  @ApiMethod(name = "topPerformers", path = "{ns}/topPerformers", httpMethod = ApiMethod.HttpMethod.GET)
  public List<JSON> topPerformers(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      String orderStr = in.getRaw("order");
      Field<?> order = Strings.isEmpty(orderStr) ? LeaderboardEntry.closed_loans : LeaderboardEntry.TYPE.field(orderStr);
      LeaderboardEntry.LeaderboardType leaderboardType = in.demand(LeaderboardEntry.type);
      if (LeaderboardEntry.LeaderboardType.consecutive_loan_officers.equals(leaderboardType)) {
        leaderboardType = LeaderboardEntry.closed_loans.equals(order)
                ? LeaderboardEntry.LeaderboardType.consecutive_loan_officers_by_loan_count
                : LeaderboardEntry.LeaderboardType.consecutive_loan_officers_by_loan_amount;
      }
      Bundle bundle = new Bundle();

      List<JSON> results = getTopTen(order, bundle.find(LeaderboardEntry.TYPE)
              .whereEquals(LeaderboardEntry.leaderboard, leaderboardType.name() + "-" + in.keyName()));

      Map<String, HasValues> competitorBeans = new HashMap<>();
      bundle.getByKeys(results.stream()
                      .map(LeaderboardEntry.competitor)
                      .map(bundle::stringToKey)
                      .collect(Collectors.toList()))
              .forEach(bean -> competitorBeans.put(bean.key(), bean));
      for (JSON result : results) {
        result.set(LeaderboardEntry.competitor.dot(),
                competitorBeans.get(result.get(LeaderboardEntry.competitor))
                        .subMap(HasKey.key, HasKeyName.keyName, HasId.id,
                                Admin.first_name, Admin.middle_name, Admin.last_name,
                                Admin.company_phone, Admin.company_email, Admin.role,
                                Admin.avatar, Admin.avatar_thumbnail,
                                Admin.originator_nmls, Admin.domain_url,
                                Lender.name, Lender.logo, Lender.logo_thumbnail,
                                Admin.avg_rate_all_source_review, Admin.total_all_source_review));
      }
      return results;
    });
  }

  private <T> List<JSON> getTopTen(Field<T> order, QueryBuilder<Bean> query) {
    List<String> hideLoanOfficers = new Bundle()
            .get(LoanConfiguration.TYPE, LoanConfiguration.DEFAULT_ID)
            .get(LoanConfiguration.hide_from_rankings);
    int hideLoanOfficerSize = Colls.isEmpty(hideLoanOfficers) ? 0 : hideLoanOfficers.size();

    Stream<Bean> findStream = query
            .orderBy(order, false)
            .orderBy(LeaderboardEntry.closed_loans.equals(order)
                    ? LeaderboardEntry.loan_amount
                    : LeaderboardEntry.closed_loans, false)
            .list(99 + hideLoanOfficerSize)
            .stream();
    if (hideLoanOfficerSize > 0) {
      findStream = findStream.filter(bean -> !hideLoanOfficers.contains(bean.get(LeaderboardEntry.competitor)));
    }
    List<Bean> beans = findStream.toList();

    if (beans.size() > 10) {
      List<JSON> result = new ArrayList<>();
      T lowestValue = beans.get(9).get(order);

      for (int i = 0; i < beans.size(); ++i) {
        if (i < 10 || beans.get(i).is(order, lowestValue)) {
          result.add(beans.get(i).toMap());
        } else {
          break;
        }
      }

      return result;
    }

    return beans.stream().map(Bean::toMap).toList();
  }

  @ApiMethod(name = "trackingUserAccess", path = "{ns}/trackingUserAccess", httpMethod = ApiMethod.HttpMethod.POST)
  public Object trackingUserAccess(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      input.remove("ns");
      return OpRegistry.get(UpdateMarketingCampaignVisitOp.class).execute(input);
    });
  }

  @ApiMethod(name = "contactUs", path = "{ns}/contactUs", httpMethod = ApiMethod.HttpMethod.POST)
  public Object contactUs(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, input.remove("agent_email"));
      input.remove("ns");
      input.type(CustomerRequest.TYPE);
      return OpRegistry.get(SaveCustomerRequestOp.class).execute(input);
    });
  }

  @ApiMethod(name = "detectCensusTractForPurchaseLoan", path = "{ns}/detectCensusTractForPurchaseLoan", httpMethod = ApiMethod.HttpMethod.GET)
  public JSON detectCensusTractForPurchaseLoan(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      if (input.hasValue(Loan.street)) {
        return OpRegistry.get(DetectCensusTractForPurchaseLoanOp.class).execute(input);
      } else {
        throw new BadRequestException("Street is required");
      }
    });
  }

  @ApiMethod(name = "getNewsLetters", path = "{ns}/getNewsLetters", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getNewsLetters(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");

      in.type(CRMSubscriptionContent.TYPE);
      in.set(CRMSubscriptionContent.published, true);

      final String order = in.getRaw("order");
      if (Strings.isNotEmpty(order)) {
        in.set(TableParams.ORDER, List.of(order));
      }

      final String category = in.getRaw("category");
      if (Strings.isNotEmpty(category)) {
        in.set(CRMSubscriptionContent.additional_labels, Collections.singletonList(category));
      }

      in.set(TableParams.ADDL_COLUMNS, Arrays.asList(CRMSubscriptionContent.owner.name(),
              CRMSubscriptionContent.owner.dot(com.mvu.core.shared.entity.Admin.full_name).name()));

      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getNewsLettersDetail", path = "{ns}/getNewsLetters/{keyName}", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getNewsLettersDetail(HttpServletRequest req, @Named("ns") String ns, @Named("keyName") String keyName, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");

      in.type(CRMSubscriptionContent.TYPE);
      in.set(CRMSubscriptionContent.keyName, keyName);

      return OpRegistry.get(GetOp.class).execute(in);
    });
  }

  @ApiMethod(name = "registerSubscription", path = "{ns}/registerSubscription", httpMethod = ApiMethod.HttpMethod.POST)
  public Object registerSubscription(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(CRMSubscriptionContact.TYPE);
      return OpRegistry.get(ClientRegisterSubscriptionListOp.class).execute(in);
    });
  }

  @ApiMethod(name = "sendMail", path = "{ns}/sendMail", httpMethod = ApiMethod.HttpMethod.POST)
  public Object sendMail(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");

      final String from = in.get(Template.from);
      if (Strings.isEmpty(from)) {
        in.set(Template.from, Server.getCompany().get(Company.email));
      }

      final String replyTo = in.get(Template.reply_to);
      if (Strings.isEmpty(replyTo)) {
        in.set(Template.reply_to, Server.getCompany().get(Company.email));
      }
      in.set(FormParams.is_new, true);

      return OpRegistry.get(EmailOp.class).execute(in);
    });
  }

  @ApiMethod(name = "sendSMS", path = "{ns}/sendSMS", httpMethod = ApiMethod.HttpMethod.POST)
  public Object sendSMS(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      return OpRegistry.get(SendSMSOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getYoutubeEmbed", path = "{ns}/getYoutubeEmbed", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getYoutubeEmbed(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");

      return OpRegistry.get(GetYoutubeEmbedHTMLOp.class).execute(in);
    });
  }

  @ApiMethod(name = "isEnableModule", path = "{ns}/isEnableModule/{module_name}", httpMethod = ApiMethod.HttpMethod.GET)
  public Object isEnableModule(HttpServletRequest req, @Named("ns") String ns, @Named("module_name") String module_name, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      return Modules.modules.isEnableModule(module_name);
    });
  }

  @ApiMethod(name = "getUserProfilesList", path = "{ns}/getUserProfilesList", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getUserProfilesList(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      in.remove("ns");
      return new GetUserProfilesListOp().execute(JSON.empty());
    });
  }

  @ApiMethod(name = "departments", path = "{ns}/getDepartments", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getDepartments(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      // The kind is this endpoint's, not the caller's: with a caller-chosen kind this was a generic
      // anonymous FindOp over any entity.
      in.type(DepartmentSetting.TYPE);

      CellData cellData = OpRegistry.get(FindOp.class).execute(in);

      List<HasValues> rows = cellData.getRows();
      List<String> adminKeyNames = rows.stream()
              .flatMap(row -> row.hasValue(DepartmentSetting.members)
                      ? row.get(DepartmentSetting.members).stream()
                      : Stream.empty()
              ).toList();
      Map<String, HasValues> admins = new Bundle().getByKeyNames(Admin.TYPE, adminKeyNames).stream()
              .collect(Collectors.toMap(Admin.keyName, admin -> admin.toMap(
                      Admin.key, Admin.keyName, Admin.first_name, Admin.middle_name,
                      Admin.last_name, Admin.company_email, Admin.company_phone, Admin.avatar)));
      rows.forEach(row -> {
        if (row.hasValue(DepartmentSetting.members)) {
          row.set(DepartmentSetting.members.dot(), row.get(DepartmentSetting.members).stream().map(admins::get).toList());
        }
        if (row.hasValue(DepartmentSetting.head_of_department)) {
          row.set(DepartmentSetting.head_of_department.dot(), admins.get(row.get(DepartmentSetting.head_of_department)));
        }
      });
      return cellData;
    });
  }

  @ApiMethod(name = "numberOfRushTicket", path = "{ns}/numberOfRushTicket", httpMethod = ApiMethod.HttpMethod.POST)
  public Object getNumberOfRushTicket(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      ThreadContext.setRequestUser(Server.appConfig().createSessionUser(new Bundle().demand(in.remove(HasKey.key))));
      in.remove("ns");

      return OpRegistry.get(GetNumberTicketsRushAdminOp.class)
              .execute(JSON.empty().copyFrom(in, EscalationTicket.department));
    });
  }

  @ApiMethod(name = "escalationTicket", path = "{ns}/createEscalationTicket", httpMethod = ApiMethod.HttpMethod.POST)
  public Object createEscalationTicket(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");

      JSON params = JSON.empty().type(EscalationTicket.TYPE)
              .copyFrom(in, EscalationTicket.department, EscalationTicket.description, EscalationTicket.owner, EscalationTicket.is_rush)
              .set(EscalationTicket.status, EscalationTicketStatus.New)
              .set(EscalationTicket.priority, EscalationTicketPriority.Medium)
              .set(EscalationTicket.requested_by, in.remove(HasKey.key));

      return OpRegistry.get(SaveOp.class).execute(params);
    });
  }

  @ApiMethod(name = "getUploadUrl", path = "{ns}/getUploadUrl", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getUploadUrl(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, json -> {
      beforeRequest(req, ns, extractLOEmail(input));
      input.remove("ns");
      return new GetUploadUrlOp().execute(input);
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  @ApiMethod(name = "getOwnersInfoOfTransaction", path = "{ns}/getOwnerInfoOfTransaction/{transactionId}", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getOwnersInfoOfTransaction(HttpServletRequest req, @Named("ns") String ns, @Named("transactionId") Long transactionId, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");

      final Bundle bundle = new Bundle();
      final Bean transaction = bundle.get(Loan.TYPE, transactionId);
      if (Objects.isNull(transaction)) {
        return JSON.empty().set("payload", Collections.emptyList());
      }

      final List<Map<String, Object>> userInfos = new ArrayList<>();
      addOwnerInfo(userInfos, "LOAN_OFFICER", transaction, Loan.agent);
      addOwnerInfo(userInfos, "ADDITIONAL_LOAN_OFFICER", transaction, Loan.additional_lo);
      addOwnerInfo(userInfos, "TEAM_LEADER", transaction, Loan.leader_mentor_lo);
      addOwnerInfo(userInfos, "LOAN_ASSISTANT", transaction, Loan.originator_assistant);
      addOwnerInfo(userInfos, "LOAN_COORDINATOR", transaction, Loan.setup_specialist);
      addOwnerInfo(userInfos, "LOAN_PROCESSOR", transaction, Loan.processor);
      addOwnerInfo(userInfos, "SUBMISSION_PROCESSOR", transaction, Loan.submission_processor);
      addOwnerInfo(userInfos, "CONDITION_PROCESSOR", transaction, Loan.condition_processor);
      addOwnerInfo(userInfos, "CLOSING_PROCESSOR", transaction, Loan.closing_processor);
      addOwnerInfo(userInfos, "REALTOR_SPECIALIST", transaction, Loan.realtor_specialist);
      addOwnerInfo(userInfos, "DISCLOSURE_SPECIALIST", transaction, Loan.disclosure_specialist);
      addOwnerInfo(userInfos, "UNDERWRITER", transaction, Loan.underwriter);
      addOwnerInfo(userInfos, "LENDING_FUNDER", transaction, Loan.lending_funder);
      addOwnerInfo(userInfos, "LENDING_CLOSER", transaction, Loan.lending_closer);
      addOwnerInfo(userInfos, "LENDING_POST_CLOSING", transaction, Loan.lending_post_closing);
      addOwnerInfo(userInfos, "REALTOR", transaction, Loan.referral_partner);

      final Bean borrower = new Bundle().get(Client.TYPE, transaction.get(Loan.email));
      if (Objects.nonNull(borrower)) {
        userInfos.add(buildUserInfo("CLIENT", borrower));
      }

      return JSON.empty().set("payload", userInfos);
    });
  }

  @ApiMethod(name = "findNonLicenseSettings", path = "{ns}/findNonLicenseSettings", httpMethod = ApiMethod.HttpMethod.GET)
  public Object findNonLicenseSettings(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(NonLicenseSetting.TYPE);
      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  @ApiMethod(name = "saveNonLicenseSetting", path = "{ns}/saveNonLicenseSetting", httpMethod = ApiMethod.HttpMethod.POST)
  public Object saveNonLicenseSetting(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(NonLicenseSetting.TYPE);
      return OpRegistry.get(SaveMCRHistoryOp.class).execute(in);
    });
  }

  @ApiMethod(name = "deleteNonLicenseSetting", path = "{ns}/deleteNonLicenseSetting", httpMethod = ApiMethod.HttpMethod.POST)
  public Object deleteNonLicenseSetting(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(NonLicenseSetting.TYPE);
      return OpRegistry.get(DeleteOp.class).execute(in);
    });
  }

  @ApiMethod(name = "findMCRSettings", path = "{ns}/findMCRSettings", httpMethod = ApiMethod.HttpMethod.GET)
  public Object findMCRSettings(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(MCRSetting.TYPE);
      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  @ApiMethod(name = "saveMCRSetting", path = "{ns}/saveMCRSetting", httpMethod = ApiMethod.HttpMethod.POST)
  public Object saveMCRSetting(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(MCRSetting.TYPE);
      return OpRegistry.get(SaveOp.class).execute(in);
    });
  }

  @ApiMethod(name = "deleteMCRSetting", path = "{ns}/deleteMCRSetting", httpMethod = ApiMethod.HttpMethod.POST)
  public Object deleteMCRSetting(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(MCRSetting.TYPE);
      return OpRegistry.get(DeleteOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getMCRHistories", path = "{ns}/getMCRHistories", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getMCRHistories(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));
      in.remove("ns");
      in.type(MCRHistory.TYPE);
      return OpRegistry.get(GetMCRHistoriesOp.class).execute(in);
    });
  }

  private void addOwnerInfo(List<Map<String, Object>> userInfos, String role, Bean transaction, FK<?> fieldName) {
    final Object fieldValue = transaction.get(fieldName);
    if (fieldValue != null) {
      Bean owner = transaction.load(fieldName);
      if (owner != null) {
        userInfos.add(buildUserInfo(role, owner));
      }
    }
  }

  private Map<String, Object> buildUserInfo(final String role, final Bean user) {
    final List<Field<?>> fields = List.of(User.first_name, User.last_name, User.email, User.company_email, User.phone,
            User.company_phone, User.kind, User.avatar, User.active, User.key, User.keyName);

    final Map<String, String> properties = new HashMap<>();
    properties.put("user_types", role);

    for (Field<?> field : fields) {
      final String name = field.name();
      final Object o = user.get(field);
      String value = Objects.isNull(o) ? Strings.EMPTY : o.toString();
      properties.put(name, value);
    }

    final String usernameEncrypt = OpenfireService.murmurHash(user.key());
    final Map<String, Object> data = new HashMap<>();
    data.put("username", usernameEncrypt);
    data.put("name", user.get(User.full_name));
    data.put("email", user.get(User.email));
    data.put("properties", properties);

    return data;
  }

  @Override
  protected String getUserKeyFromAuthHeader(final String authHeader) throws UnauthorizedException {
    Bean config = new Bundle().get(OpenIDSSOConfig.TYPE, 1L);
    try {
      if (Server.cache().exist(Server.namespace(), generateLogoutKey(authHeader))) {
        throw new UnauthorizedException("Invalid token");
      }
      String publicKey = config.get(OpenIDSSOConfig.public_key).replaceAll("-----BEGIN PUBLIC KEY-----", "")
              .replaceAll("-----END PUBLIC KEY-----", "").replaceAll("\\n", "");
      Jws<Claims> claimsJws = Jwts.parser().verifyWith(getPublicKey(publicKey)).build().parseClaimsJws(authHeader);
      return claimsJws.getBody().get("user_key").toString();
    } catch (Exception e) {
      throw new UnauthorizedException("Invalid token");
    }
  }

  public static String generateLogoutKey(String authHeader) {
    return Strings.join("_", LOGOUT_PREFIX, authHeader);
  }

  public static RSAPublicKey getPublicKey(String publicKeyStr) throws Exception {
    KeyFactory keyFactory = KeyFactory.getInstance("RSA");
    byte[] keyBytes = Base64.getDecoder().decode(publicKeyStr.getBytes(StandardCharsets.UTF_8));
    X509EncodedKeySpec specPublic = new X509EncodedKeySpec(keyBytes);
    PublicKey fileGeneratedPublicKey = keyFactory.generatePublic(specPublic);
    return (RSAPublicKey) (fileGeneratedPublicKey);
  }

  /**
   * Pylon Borrower Tasks (Client Portal)
   * Get borrower tasks for a loan from Pylon.
   *
   * <p>Params:</p>
   * <ul>
   *   <li><b>pylonLoanId</b> (required) — Pylon loan ID (e.g. "app_XXX")</li>
   *   <li><b>status</b> (optional) — Filter: "pending", "completed", or "all" (default: "all")</li>
   * </ul>
   *
   * <p>Returns borrower tasks grouped by borrower. Does NOT include loan officer tasks
   * since this endpoint is for the client/borrower portal.</p>
   */
  @ApiMethod(name = "getPylonBorrowerTasks", path = "{ns}/pylon/tasks", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getPylonBorrowerTasks(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));

      String pylonLoanId = in.getRaw("pylonLoanId");
      if (Strings.isEmpty(pylonLoanId)) {
        return JSON.empty().set("error", "Missing required param: pylonLoanId");
      }

      String statusFilter = in.getRaw("status");
      if (Strings.isEmpty(statusFilter)) {
        statusFilter = "all";
      }

      PylonTaskService taskService = PylonClient.instance().tasks();

      LoanTasks loanTasks;
      if ("pending".equals(statusFilter)) {
        loanTasks = taskService.getPendingTasksForLoan(pylonLoanId);
      } else {
        loanTasks = taskService.getTasksForLoan(pylonLoanId);
      }

      // Build response — borrower tasks only (client portal)
      List<JSON> borrowerGroups = new ArrayList<>();
      for (BorrowerTaskGroup group : loanTasks.borrowerTaskGroups) {
        List<JSON> tasks = group.tasks;

        if ("completed".equals(statusFilter)) {
          tasks = new ArrayList<>();
          for (JSON task : group.tasks) {
            if ("COMPLETED".equals(task.getRaw("status"))) {
              tasks.add(task);
            }
          }
        }

        if (!tasks.isEmpty()) {
          JSON groupJson = JSON.empty();
          groupJson.set("borrowerId", group.borrowerId);
          groupJson.set("borrowerName", group.borrowerName);
          groupJson.set("taskCount", tasks.size());
          groupJson.set("tasks", tasks);
          borrowerGroups.add(groupJson);
        }
      }

      int totalCount = 0;
      for (JSON g : borrowerGroups) {
        Number count = g.getRaw("taskCount");
        totalCount += count.intValue();
      }

      JSON result = JSON.empty();
      result.set("pylonLoanId", pylonLoanId);
      result.set("currentStage", loanTasks.currentStage);
      result.set("statusFilter", statusFilter);
      result.set("totalTaskCount", totalCount);
      result.set("borrowerTaskGroups", borrowerGroups);
      return result;
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Pylon D1C/AIM — Truv Income Verification
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Initialize Pylon entities and return a Truv Bridge token for income verification.
   *
   * <p>If Pylon entities already exist for this loan (deal/loan IDs on {@link Loan},
   * borrower ID on {@link Borrower#pylon_id}), reuses them. Otherwise creates
   * Deal → Loan → Borrower in Pylon and persists the IDs on the loan/borrower.</p>
   *
   * <h3>Request</h3>
   * <pre>
   * POST /api/webplus/v1/{ns}/pylon/truv/token
   * {
   *   "loanId": 12345,
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "email": "john@example.com",
   *   "dateOfBirth": "1990-05-15",   // optional
   *   "ssn": "999405000",            // optional
   *   "loanPurpose": "PURCHASE",
   *   "purchasePrice": 500000
   * }
   * </pre>
   *
   * <h3>Response</h3>
   * <pre>
   * {
   *   "bridgeToken": "5ae38c6e...",
   *   "pylonDealId": "morwor_...",
   *   "pylonLoanId": "app_...",
   *   "pylonBorrowerId": "borr_..."
   * }
   * </pre>
   */
  @ApiMethod(name = "getTruvBridgeToken", path = "{ns}/pylon/truv/token", httpMethod = ApiMethod.HttpMethod.POST)
  public Object getTruvBridgeToken(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));

      Number loanIdNum = in.getRaw("loanId");
      if (loanIdNum == null) {
        return JSON.empty().set("error", "Missing required field: loanId");
      }

      PylonClient pylon = PylonClient.instance();
      PylonVerificationService verification = pylon.verification();

      // disableEvents + disableSideEffect: belt-and-suspenders to keep any
      // borrower save here from triggering downstream events that might race
      // with the verification flow.
      Bundle bundle = new Bundle();
      bundle.disableEvents(true);
      bundle.disableSideEffect(true);
      long loanId = loanIdNum.longValue();
      Bean loan = bundle.get(Loan.TYPE, loanId);

      // Resolve the target borrower by index (0 = primary, 1+ = co-borrower)
      Object rawBorrowerIndex = in.getRaw("borrowerIndex");
      int borrowerIndex = 0;
      if (rawBorrowerIndex instanceof Number) {
        borrowerIndex = ((Number) rawBorrowerIndex).intValue();
      } else if (rawBorrowerIndex != null) {
        try {
          borrowerIndex = Integer.parseInt(rawBorrowerIndex.toString());
        } catch (NumberFormatException ignored) {
        }
      }

      List<Long> borrowerIds = loan.get(Loan.borrowers);
      if (Colls.isEmpty(borrowerIds) || borrowerIndex >= borrowerIds.size()) {
        return JSON.empty().set("error", "Borrower not found at index " + borrowerIndex);
      }

      // Pylon Deal + Loan are created by ShouldSubmitToPylonOp (user-triggered "Submit to Pylon").
      // This endpoint only needs to read them — never create them here to avoid duplicates.
      String pylonDealId = loan.get(Loan.pylon_loan_id.dot(com.mvu.loan.shared.entity.PylonLoan.deal_id));
      String pylonLoanId = loan.get(Loan.pylon_loan_id);

      if (Strings.isEmpty(pylonLoanId)) {
        return JSON.empty().set("error", "Loan has not been synced to Pylon yet. Please save the loan first.");
      }

      // Re-read borrower from a clean bundle so we pick up any pylon_id that
      // a concurrent SyncApplicationToPylonOp may have just written.
      Bean freshBorrower = new Bundle().get(Borrower.TYPE, borrowerIds.get(borrowerIndex));
      String pylonBorrowerId = freshBorrower.get(Borrower.pylon_id);
      if (Strings.isEmpty(pylonBorrowerId)) {
        // The orchestrator's borrower.ensure step hasn't run yet — create the
        // Pylon borrower here.
        // Pull PII from the local Borrower (source of truth); the request input is
        // a fallback for fields the local record lacks. The public verify-link FE
        // doesn't echo DOB/SSN back (they're masked on resolve), so without this
        // the Pylon borrower would be created without them and Truv's
        // createInitializationToken would fail with TRUV_BAD_REQUEST.
        String firstName = pickNonEmpty(freshBorrower.get(com.mvu.core.shared.entity.Contact.first_name), in.getRaw("firstName"));
        String lastName = pickNonEmpty(freshBorrower.get(com.mvu.core.shared.entity.Contact.last_name), in.getRaw("lastName"));
        String email = pickNonEmpty(freshBorrower.get(HasEmail.email), in.getRaw("email"));
        if (Strings.isEmpty(firstName) || Strings.isEmpty(lastName) || Strings.isEmpty(email)) {
          return JSON.empty().set("error", "Missing required fields: firstName, lastName, email");
        }

        String dateOfBirth = pickNonEmpty(freshBorrower.get(Borrower.date_of_birth_tz), in.getRaw("dateOfBirth"));
        String ssn = pickNonEmpty(freshBorrower.get(Borrower.ssn), in.getRaw("ssn"));
        if (Strings.isEmpty(dateOfBirth) || Strings.isEmpty(ssn)) {
          return JSON.empty().set("error",
                  "Income verification requires date of birth and SSN. " +
                          "Please complete your borrower profile before verifying income.");
        }

        JSON pylonBorrower = pylon.borrowers().createFull(pylonDealId,
                new com.loanfactory.integration.pylon.types.PylonBorrowerPersonalInformation()
                        .setFirstName(firstName)
                        .setLastName(lastName)
                        .setEmail(email)
                        .setDateOfBirth(dateOfBirth)
                        .setSocialSecurityNumber(ssn));
        pylonBorrowerId = pylonBorrower.getRaw("id");

        freshBorrower.set(Borrower.pylon_id, pylonBorrowerId);
        freshBorrower.save();
      }

      // Get Truv bridge token for this specific borrower
      String bridgeToken = verification.getTruvBridgeToken(pylonBorrowerId);

      JSON result = JSON.empty();
      result.set("bridgeToken", bridgeToken);
      result.set("pylonDealId", pylonDealId);
      result.set("pylonLoanId", pylonLoanId);
      result.set("pylonBorrowerId", pylonBorrowerId);
      result.set("borrowerIndex", borrowerIndex);
      return result;
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  /**
   * Sync verified income + employment data from Pylon into {@code PylonEmployment} records.
   *
   * <p>Call this after Truv verification completes. Queries Pylon for all verified
   * incomes on the loan and creates/updates {@code PylonEmployment} entities
   * linked to the loan via {@code transaction_id}.</p>
   *
   * <h3>Request</h3>
   * <pre>
   * POST /api/webplus/v1/{ns}/pylon/income/sync
   * { "loanId": 12345 }
   * </pre>
   *
   * <h3>Response</h3>
   * <pre>
   * {
   *   "pylonLoanId": "app_...",
   *   "totalSynced": 2,
   *   "borrowers": [
   *     { "pylonBorrowerId": "borr_...", "name": "John Doe", "incomesTotal": 3, "verifiedSynced": 2 }
   *   ]
   * }
   * </pre>
   */
  /**
   * Get all synced PylonEmployment records for a loan.
   *
   * <h3>Request</h3>
   * <pre>GET /api/webplus/v1/{ns}/pylon/income?loanId=12345</pre>
   *
   * <h3>Response</h3>
   * <pre>{ "employments": [...], "count": 2 }</pre>
   */
  @ApiMethod(name = "getPylonEmployments", path = "{ns}/pylon/income", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getPylonEmployments(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));

      Number loanIdNum = in.getRaw("loanId");
      if (loanIdNum == null) {
        return JSON.empty().set("error", "Missing required field: loanId");
      }

      long loanId = loanIdNum.longValue();
      Bundle bundle = new Bundle();
      bundle.readOnly();
      List<Bean> records = bundle.find(PylonEmployment.TYPE)
              .whereEquals(PylonEmployment.transaction_id, loanId)
              .list();

      List<JSON> employments = new ArrayList<>();
      for (Bean pe : records) {
        JSON emp = JSON.empty();
        emp.set("id", pe.id());
        emp.set("pylon_income_id", pe.get(PylonEmployment.pylon_income_id));
        emp.set("employer_name", pe.get(PylonEmployment.employer_name));
        emp.set("position", pe.get(PylonEmployment.position));
        emp.set("start_tz", pe.get(PylonEmployment.start_date_tz));
        emp.set("end_tz", pe.get(PylonEmployment.end_date_tz));
        emp.set("current", pe.get(PylonEmployment.current));
        emp.set("primary", pe.get(PylonEmployment.primary));
        emp.set("self_employed", pe.get(PylonEmployment.self_employed));
        emp.set("verified_amount", pe.get(PylonEmployment.verified_amount));
        emp.set("qualified_amount", pe.get(PylonEmployment.qualified_amount));
        emp.set("stated_amount", pe.get(PylonEmployment.stated_amount));
        emp.set("income_pay_type", pe.get(PylonEmployment.income_pay_type));
        emp.set("income_type", pe.get(PylonEmployment.income_type));
        emp.set("voie_report_id", pe.get(PylonEmployment.voie_report_id));
        emp.set("street", pe.get(Address.street));
        emp.set("city", pe.get(Address.city));
        emp.set("state", pe.get(Address.state));
        emp.set("zip", pe.get(Address.zip));
        String status = pe.get(PylonEmployment.employment_status) != null
                ? pe.get(PylonEmployment.employment_status).name() : null;
        emp.set("employment_status", status);
        employments.add(emp);
      }

      JSON result = JSON.empty();
      result.set("employments", employments);
      result.set("count", employments.size());
      return result;
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  @ApiMethod(name = "syncPylonIncomeToLoan", path = "{ns}/pylon/income/sync", httpMethod = ApiMethod.HttpMethod.POST)
  public Object syncPylonIncomeToLoan(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));

      Number loanIdNum = in.getRaw("loanId");
      if (loanIdNum == null) {
        return JSON.empty().set("error", "Missing required field: loanId");
      }
      in.set("loanId", loanIdNum.longValue());

      return new SyncPylonIncomeOp().execute(in);
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Pylon D1C/AIM — Plaid Asset Verification
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get a Plaid Link token for a specific borrower's asset verification.
   *
   * <h3>Request</h3>
   * <pre>
   * POST /api/webplus/v1/{ns}/pylon/plaid/token
   * { "loanId": 12345, "borrowerIndex": 0 }
   * </pre>
   *
   * <h3>Response</h3>
   * <pre>
   * {
   *   "linkToken": "link-sandbox-...",
   *   "pylonDealId": "morwor_...",
   *   "pylonLoanId": "app_...",
   *   "pylonBorrowerId": "borr_...",
   *   "borrowerIndex": 0
   * }
   * </pre>
   */
  @ApiMethod(name = "getPlaidLinkToken", path = "{ns}/pylon/plaid/token", httpMethod = ApiMethod.HttpMethod.POST)
  public Object getPlaidLinkToken(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));

      Number loanIdNum = in.getRaw("loanId");
      if (loanIdNum == null) {
        return JSON.empty().set("error", "Missing required field: loanId");
      }

      PylonClient pylon = PylonClient.instance();
      PylonVerificationService verification = pylon.verification();

      // disableEvents + disableSideEffect: belt-and-suspenders to keep our own
      // Pylon-borrower write from triggering downstream events that might race
      // with the verification flow.
      Bundle bundle = new Bundle();
      bundle.disableEvents(true);
      bundle.disableSideEffect(true);
      long loanId = loanIdNum.longValue();
      Bean loan = bundle.get(Loan.TYPE, loanId);

      // Resolve target borrower
      Object rawBorrowerIndex = in.getRaw("borrowerIndex");
      int borrowerIndex = 0;
      if (rawBorrowerIndex instanceof Number) {
        borrowerIndex = ((Number) rawBorrowerIndex).intValue();
      } else if (rawBorrowerIndex != null) {
        try {
          borrowerIndex = Integer.parseInt(rawBorrowerIndex.toString());
        } catch (NumberFormatException ignored) {
        }
      }

      List<Long> borrowerIds = loan.get(Loan.borrowers);
      if (Colls.isEmpty(borrowerIds) || borrowerIndex >= borrowerIds.size()) {
        return JSON.empty().set("error", "Borrower not found at index " + borrowerIndex);
      }

      String pylonDealId = loan.get(Loan.pylon_loan_id.dot(com.mvu.loan.shared.entity.PylonLoan.deal_id));
      String pylonLoanId = loan.get(Loan.pylon_loan_id);
      if (Strings.isEmpty(pylonLoanId)) {
        return JSON.empty().set("error", "Loan has not been synced to Pylon yet. Please save the loan first.");
      }

      // Re-read borrower from a clean bundle so we pick up any pylon_id that
      // a concurrent SyncApplicationToPylonOp may have just written.
      Bean freshBorrower = new Bundle().get(Borrower.TYPE, borrowerIds.get(borrowerIndex));
      String pylonBorrowerId = freshBorrower.get(Borrower.pylon_id);
      if (Strings.isEmpty(pylonBorrowerId)) {
        String firstName = in.getRaw("firstName");
        String lastName = in.getRaw("lastName");
        String email = in.getRaw("email");
        if (Strings.isEmpty(firstName) || Strings.isEmpty(lastName) || Strings.isEmpty(email)) {
          return JSON.empty().set("error", "Missing required fields: firstName, lastName, email");
        }
        String dateOfBirth = in.getRaw("dateOfBirth");
        String ssn = in.getRaw("ssn");

        JSON pylonBorrower = pylon.borrowers().createFull(pylonDealId,
                new com.loanfactory.integration.pylon.types.PylonBorrowerPersonalInformation()
                        .setFirstName(firstName)
                        .setLastName(lastName)
                        .setEmail(email)
                        .setDateOfBirth(dateOfBirth)
                        .setSocialSecurityNumber(ssn));
        pylonBorrowerId = pylonBorrower.getRaw("id");

        freshBorrower.set(Borrower.pylon_id, pylonBorrowerId);
        freshBorrower.save();
      }

      // Get Plaid link token for this borrower
      String linkToken = verification.getPlaidLinkToken(pylonBorrowerId);

      JSON result = JSON.empty();
      result.set("linkToken", linkToken);
      result.set("pylonDealId", pylonDealId);
      result.set("pylonLoanId", pylonLoanId);
      result.set("pylonBorrowerId", pylonBorrowerId);
      result.set("borrowerIndex", borrowerIndex);
      return result;
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  /**
   * Exchange a Plaid public token with Pylon after Link widget completion.
   *
   * <h3>Request</h3>
   * <pre>
   * POST /api/webplus/v1/{ns}/pylon/plaid/exchange
   * {
   *   "loanId": 12345,
   *   "pylonBorrowerId": "borr_...",
   *   "publicToken": "public-sandbox-..."
   * }
   * </pre>
   */
  @ApiMethod(name = "exchangePlaidToken", path = "{ns}/pylon/plaid/exchange", httpMethod = ApiMethod.HttpMethod.POST)
  public Object exchangePlaidToken(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));

      String pylonBorrowerId = in.getRaw("pylonBorrowerId");
      String publicToken = in.getRaw("publicToken");
      if (Strings.isEmpty(pylonBorrowerId) || Strings.isEmpty(publicToken)) {
        return JSON.empty().set("error", "Missing required fields: pylonBorrowerId, publicToken");
      }

      // Pylon requires plaidMetadata (institutionId, institutionName, linkSessionId)
      // when exchanging a Plaid token. Pull from Plaid's onSuccess metadata.
      String institutionId = null;
      String institutionName = null;
      String linkSessionId = null;
      JSON plaidMeta = in.getObject("plaidMetadata");
      if (plaidMeta != null) {
        linkSessionId = plaidMeta.getRaw("link_session_id");
        JSON institution = plaidMeta.getObject("institution");
        if (institution != null) {
          institutionId = institution.getRaw("institution_id");
          institutionName = institution.getRaw("name");
        }
      }

      PylonClient pylon = PylonClient.instance();
      JSON exchangeResult = pylon.verification().exchangePlaidToken(
              pylonBorrowerId, publicToken, institutionId, institutionName, linkSessionId);

      JSON result = JSON.empty();
      result.set("itemId", exchangeResult.getRaw("itemId"));
      result.set("success", true);
      return result;
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  /**
   * Sync verified asset data from Pylon into {@code PylonAsset} + {@code Loan.assets}.
   * Accepts Plaid metadata from the widget's onSuccess callback for audit storage.
   *
   * <h3>Request</h3>
   * <pre>
   * POST /api/webplus/v1/{ns}/pylon/assets/sync
   * {
   *   "loanId": 12345,
   *   "borrowerIndex": 0,
   *   "plaidMetadata": { ... optional — full Plaid onSuccess metadata ... }
   * }
   * </pre>
   */
  @ApiMethod(name = "syncPylonAssets", path = "{ns}/pylon/assets/sync", httpMethod = ApiMethod.HttpMethod.POST)
  public Object syncPylonAssets(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));

      Number loanIdNum = in.getRaw("loanId");
      if (loanIdNum == null) {
        return JSON.empty().set("error", "Missing required field: loanId");
      }
      in.set("loanId", loanIdNum.longValue());

      return new SyncPylonAssetOp().execute(in);
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  /**
   * Get all synced {@code PylonAsset} records for a loan.
   *
   * <h3>Request</h3>
   * <pre>GET /api/webplus/v1/{ns}/pylon/assets?loanId=12345</pre>
   */
  @ApiMethod(name = "getPylonAssets", path = "{ns}/pylon/assets", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getPylonAssets(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input));

      Number loanIdNum = in.getRaw("loanId");
      if (loanIdNum == null) {
        return JSON.empty().set("error", "Missing required field: loanId");
      }

      long loanId = loanIdNum.longValue();
      Bundle bundle = new Bundle();
      bundle.readOnly();
      List<Bean> records = bundle.find(com.mvu.loan.shared.entity.PylonAsset.TYPE)
              .whereEquals(com.mvu.loan.shared.entity.PylonAsset.transaction_id, loanId)
              .list();

      List<JSON> assets = new ArrayList<>();
      for (Bean pa : records) {
        JSON aj = JSON.empty();
        aj.set("id", pa.id());
        aj.set("pylon_asset_id", pa.get(com.mvu.loan.shared.entity.PylonAsset.pylon_asset_id));
        aj.set("pylon_borrower_id", pa.get(com.mvu.loan.shared.entity.PylonAsset.pylon_borrower_id));
        aj.set("asset_type", pa.get(com.mvu.loan.shared.entity.PylonAsset.asset_type));
        aj.set("is_liability", pa.get(com.mvu.loan.shared.entity.PylonAsset.is_liability));
        aj.set("is_joint", pa.get(com.mvu.loan.shared.entity.PylonAsset.is_joint));
        aj.set("institution_name", pa.get(com.mvu.loan.shared.entity.PylonAsset.institution_name));
        aj.set("account_identifier", pa.get(com.mvu.loan.shared.entity.PylonAsset.account_identifier));
        aj.set("amount", pa.get(com.mvu.loan.shared.entity.PylonAsset.amount));
        aj.set("plaid_institution_name", pa.get(com.mvu.loan.shared.entity.PylonAsset.plaid_institution_name));
        aj.set("plaid_account_mask", pa.get(com.mvu.loan.shared.entity.PylonAsset.plaid_account_mask));
        aj.set("plaid_account_subtype", pa.get(com.mvu.loan.shared.entity.PylonAsset.plaid_account_subtype));
        assets.add(aj);
      }

      JSON result = JSON.empty();
      result.set("assets", assets);
      result.set("count", assets.size());
      return result;
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Public borrower verification link endpoints
  //
  //  All endpoints under /public/verify/* are authorized solely by a
  //  256-bit opaque token bound to a single borrower. No session, no cookie.
  //  Sensitive data is masked on the resolve response.
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Resolve token → borrower context + masked synced data. First entry point.
   */
  @ApiMethod(name = "resolveVerifyLink", path = "{ns}/public/verify/resolve", httpMethod = ApiMethod.HttpMethod.POST)
  public Object resolveVerifyLink(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns);
      VerifyLinkContext ctx = loadAndTouchLink(in.getRaw("token"));
      if (ctx.error != null) {
        return JSON.empty().set("error", ctx.error).set("status", ctx.status);
      }
      return buildResolveResponse(ctx);
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  /**
   * Issue a Truv bridge token for the borrower bound to this link.
   */
  @ApiMethod(name = "getVerifyTruvToken", path = "{ns}/public/verify/truv/token", httpMethod = ApiMethod.HttpMethod.POST)
  public Object getVerifyTruvToken(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns);
      VerifyLinkContext ctx = loadAndTouchLink(in.getRaw("token"));
      if (ctx.error != null) {
        return JSON.empty().set("error", ctx.error);
      }
      if (!ctx.allowTruv) {
        return JSON.empty().set("error", "Income verification is not enabled for this link");
      }
      JSON delegated = delegatedFor(ctx)
              .set("firstName", in.getRaw("firstName"))
              .set("lastName", in.getRaw("lastName"))
              .set("email", in.getRaw("email"))
              .set("dateOfBirth", in.getRaw("dateOfBirth"))
              .set("ssn", in.getRaw("ssn"));
      LOG.warning(LOG_TAG_TRUV + " verify-link token-request"
              + " linkId=" + ctx.linkId
              + " loanId=" + ctx.loanId
              + " borrowerId=" + ctx.borrowerId
              + " borrowerIndex=" + ctx.borrowerIndex);
      return getTruvBridgeToken(req, ns, delegated);
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  /**
   * Issue a Plaid link token for the borrower bound to this link.
   */
  @ApiMethod(name = "getVerifyPlaidToken", path = "{ns}/public/verify/plaid/token", httpMethod = ApiMethod.HttpMethod.POST)
  public Object getVerifyPlaidToken(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns);
      VerifyLinkContext ctx = loadAndTouchLink(in.getRaw("token"));
      if (ctx.error != null) {
        return JSON.empty().set("error", ctx.error);
      }
      if (!ctx.allowPlaid) {
        return JSON.empty().set("error", "Asset verification is not enabled for this link");
      }
      JSON delegated = delegatedFor(ctx)
              .set("firstName", in.getRaw("firstName"))
              .set("lastName", in.getRaw("lastName"))
              .set("email", in.getRaw("email"))
              .set("dateOfBirth", in.getRaw("dateOfBirth"))
              .set("ssn", in.getRaw("ssn"));
      LOG.warning(LOG_TAG_PLAID + " verify-link token-request"
              + " linkId=" + ctx.linkId
              + " loanId=" + ctx.loanId
              + " borrowerId=" + ctx.borrowerId
              + " borrowerIndex=" + ctx.borrowerIndex);
      return getPlaidLinkToken(req, ns, delegated);
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  /**
   * Exchange Plaid public token + metadata. Scoped to this link's borrower.
   */
  @ApiMethod(name = "exchangeVerifyPlaidToken", path = "{ns}/public/verify/plaid/exchange", httpMethod = ApiMethod.HttpMethod.POST)
  public Object exchangeVerifyPlaidToken(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns);
      VerifyLinkContext ctx = loadAndTouchLink(in.getRaw("token"));
      if (ctx.error != null) {
        return JSON.empty().set("error", ctx.error);
      }
      if (!ctx.allowPlaid) {
        return JSON.empty().set("error", "Asset verification is not enabled for this link");
      }
      JSON delegated = delegatedFor(ctx)
              .set("pylonBorrowerId", in.getRaw("pylonBorrowerId"))
              .set("publicToken", in.getRaw("publicToken"))
              .set("plaidMetadata", in.getRaw("plaidMetadata"));
      // Visibility on the second leg of the verify-link Plaid flow. If the
      // exchange returns an error, it almost always shows up here before
      // the FE polling loop ever sees totalSynced=0.
      Object pylonBorrowerId = in.getRaw("pylonBorrowerId");
      JSON metadata = in.getObject("plaidMetadata");
      Object institutionName = null;
      if (metadata != null) {
        JSON institution = metadata.getObject("institution");
        if (institution != null) {
          institutionName = institution.getRaw("name");
        }
      }
      LOG.warning(LOG_TAG_PLAID + " verify-link exchange-request"
              + " linkId=" + ctx.linkId
              + " loanId=" + ctx.loanId
              + " borrowerId=" + ctx.borrowerId
              + " borrowerIndex=" + ctx.borrowerIndex
              + " pylonBorrowerId=" + (pylonBorrowerId == null ? "null" : pylonBorrowerId)
              + " plaidInstitution=" + (institutionName == null ? "null" : institutionName));
      Object result = exchangePlaidToken(req, ns, delegated);
      Object error = (result instanceof JSON) ? ((JSON) result).getRaw("error") : null;
      LOG.warning(LOG_TAG_PLAID + " verify-link exchange-response"
              + " linkId=" + ctx.linkId
              + " loanId=" + ctx.loanId
              + " hasError=" + (error != null)
              + " error=" + (error == null ? "null" : error));
      return result;
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  /**
   * Sync Truv-verified income for this link's borrower; marks truv_completed_at.
   */
  @ApiMethod(name = "syncVerifyTruv", path = "{ns}/public/verify/sync/truv", httpMethod = ApiMethod.HttpMethod.POST)
  public Object syncVerifyTruv(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns);
      VerifyLinkContext ctx = loadAndTouchLink(in.getRaw("token"));
      if (ctx.error != null) {
        return JSON.empty().set("error", ctx.error);
      }
      if (!ctx.allowTruv) {
        return JSON.empty().set("error", "Income verification is not enabled for this link");
      }
      LOG.warning(LOG_TAG_TRUV + " verify-link sync-request"
              + " linkId=" + ctx.linkId
              + " loanId=" + ctx.loanId
              + " borrowerId=" + ctx.borrowerId
              + " borrowerIndex=" + ctx.borrowerIndex);
      Object result = syncPylonIncomeToLoan(req, ns, delegatedFor(ctx));
      markCompletion(ctx.linkId, true, false);
      return result;
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  /**
   * Sync Plaid-verified assets for this link's borrower; marks plaid_completed_at.
   */
  @ApiMethod(name = "syncVerifyPlaid", path = "{ns}/public/verify/sync/plaid", httpMethod = ApiMethod.HttpMethod.POST)
  public Object syncVerifyPlaid(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns);
      VerifyLinkContext ctx = loadAndTouchLink(in.getRaw("token"));
      if (ctx.error != null) {
        return JSON.empty().set("error", ctx.error);
      }
      if (!ctx.allowPlaid) {
        return JSON.empty().set("error", "Asset verification is not enabled for this link");
      }
      JSON delegated = delegatedFor(ctx)
              .set("plaidMetadata", in.getRaw("plaidMetadata"));
      LOG.warning(LOG_TAG_PLAID + " verify-link sync-request"
              + " linkId=" + ctx.linkId
              + " loanId=" + ctx.loanId
              + " borrowerId=" + ctx.borrowerId
              + " borrowerIndex=" + ctx.borrowerIndex);
      Object result = syncPylonAssets(req, ns, delegated);
      markCompletion(ctx.linkId, false, true);
      return result;
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Public borrower to-do link endpoints
  //
  //  Parallel to /public/verify/* — authorized by an opaque
  //  PylonTodoLink.token. Scope is the link's task_ids list
  //  (a subset of the loan's PylonLoanTaskItem rows).
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Resolve token → borrower context + masked task list + LO/LP contacts.
   * First call the borrower portal makes when it lands on /todos/&lt;token&gt;.
   */
  @ApiMethod(name = "resolveTodoLink", path = "{ns}/public/todos/resolve", httpMethod = ApiMethod.HttpMethod.POST)
  public Object resolveTodoLink(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns);
      TodoLinkContext ctx = loadAndTouchTodoLink(in.getRaw("token"));
      if (ctx.error != null) {
        return JSON.empty().set("error", ctx.error).set("status", ctx.status);
      }
      return buildTodoResolveResponse(ctx);
    }, ex -> JSON.empty().set("error", ex.getMessage()));
  }

  /**
   * Borrower uploads a document for one of the link's tasks. File is sent
   * base64-encoded in the JSON body so the public endpoint stays JSON-only
   * (no multipart streaming infrastructure needed). Authorization is the
   * token plus a scope check that the requested pylonTaskId is in the
   * link's task_ids list.
   *
   * <p>Input: {@code { token, pylonTaskId, fileName, fileData (base64) }}</p>
   * <p>Output: {@code { success, fileName, fileSize } | { error }}</p>
   */
  @ApiMethod(name = "uploadTodoDocument", path = "{ns}/public/todos/upload", httpMethod = ApiMethod.HttpMethod.POST)
  public Object uploadTodoDocument(HttpServletRequest req, @Named("ns") String ns, JSON input) {
    return handleRequest(input, in -> {
      beforeRequest(req, ns);
      TodoLinkContext ctx = loadAndTouchTodoLink(in.getRaw("token"));
      if (ctx.error != null) {
        return JSON.empty().set("success", false).set("error", ctx.error);
      }
      String pylonTaskId = in.getRaw("pylonTaskId") == null ? null
              : in.getRaw("pylonTaskId").toString();
      if (Strings.isEmpty(pylonTaskId)) {
        return JSON.empty().set("success", false).set("error", "Missing pylonTaskId");
      }
      if (ctx.taskIds == null || !ctx.taskIds.contains(pylonTaskId)) {
        return JSON.empty().set("success", false).set("error", "Task is not authorized for this link");
      }
      String fileName = in.getRaw("fileName") == null ? "document"
              : in.getRaw("fileName").toString();
      Object dataRaw = in.getRaw("fileData");
      if (dataRaw == null) {
        return JSON.empty().set("success", false).set("error", "Missing fileData");
      }
      byte[] fileBytes;
      try {
        fileBytes = Base64.getDecoder().decode(dataRaw.toString());
      } catch (IllegalArgumentException e) {
        return JSON.empty().set("success", false).set("error", "fileData must be base64-encoded");
      }
      if (fileBytes.length == 0) {
        return JSON.empty().set("success", false).set("error", "Empty file");
      }
      // Matches the FE cap (TodoUploadButton.MAX_UPLOAD_BYTES). App Engine
      // caps JSON request bodies around 32 MB; base64 inflates ~33%, so
      // anything over ~24 MB raw is rejected upstream with a generic 413
      // before this handler runs. Cap at 20 MB so the borrower gets a clean
      // error from this op even if a misbehaving client skips the FE check.
      if (fileBytes.length > 20 * 1024 * 1024) {
        return JSON.empty().set("success", false)
                .set("error", "File is too large. Please upload files under 20 MB.");
      }

      String pylonLoanId = ctx.loan.get(Loan.pylon_loan_id);
      if (Strings.isEmpty(pylonLoanId)) {
        return JSON.empty().set("success", false).set("error", "Loan is not linked to Pylon");
      }

      // Delegate to UploadPylonDocumentOp so the public path runs the *exact*
      // same Drive+Pylon+uploaded_files sequence the borrower-portal's my-todo
      // tab uses. This guarantees the LO sees the same { link, name, id,
      // parent, parent_name } metadata in PylonTaskTable.uploaded_files
      // regardless of whether the borrower uploaded via the public link or
      // the authenticated portal. is_lo_task is forced false — to-do links
      // never authorize LO-tab items (see the scope check in /resolve, and
      // the borrower-only filter in SendPylonTodoLinkOp).
      String contentType = in.getRaw("contentType") == null
              ? "application/octet-stream" : in.getRaw("contentType").toString();
      JSON delegated = JSON.empty();
      delegated.set(Loan.pylon_loan_id, pylonLoanId);
      delegated.set(PylonLoanTaskItem.pylon_task_id, pylonTaskId);
      delegated.set(PylonLoanTaskItem.loan_id, ctx.loanId);
      delegated.set(PylonLoanTaskItem.is_lo_task, false);

      JSON uploadResult;
      try {
        uploadResult = new com.mvu.loan.server.op.pylon.UploadPylonDocumentOp()
                .processStream(delegated, fileName, contentType,
                        new java.io.ByteArrayInputStream(fileBytes));
      } catch (Exception e) {
        LOG.warning("[TODO-LINK-UPLOAD] Upload failed"
                + " linkId=" + ctx.linkId
                + " pylonTaskId=" + pylonTaskId
                + " error=" + e.getMessage());
        return JSON.empty().set("success", false)
                .set("error", "Upload failed: " + e.getMessage());
      }

      LOG.warning("[TODO-LINK-UPLOAD] OK linkId=" + ctx.linkId
              + " loanId=" + ctx.loanId
              + " pylonTaskId=" + pylonTaskId
              + " fileSize=" + fileBytes.length);

      // Schedule a debounced Pylon task sync so the LO's PylonTaskTable shows
      // the new documentLink without a manual refresh. 2-minute delay gives
      // Pylon time to ingest the upload; same coalesce-via-memcache pattern
      // as SyncPylonDocumentsFromPylonOp and NotifyLOOfCompletedVerificationOp.
      com.mvu.loan.server.op.pylon.EnqueuePylonTaskSyncOp.enqueueIfFirst(ctx.loanId);

      JSON out = JSON.empty().set("success", true).set("fileName", fileName).set("fileSize", fileBytes.length);
      if (uploadResult != null && uploadResult.hasValue(FileParams.link)) {
        out.set("link", uploadResult.get(FileParams.link));
      }
      return out;
    }, ex -> JSON.empty().set("success", false).set("error", ex.getMessage()));
  }

  // ─── helpers ──────────────────────────────────────────────────────

  /**
   * Resolved context for a valid verify link.
   */
  private static final class VerifyLinkContext {
    long linkId;
    long loanId;
    long borrowerId;
    int borrowerIndex;
    Bean borrower;
    Bean loan;
    String error;
    String status; // "ok" | "expired" | "revoked" | "not_found"
    Date expiresAt;
    boolean truvCompleted;
    boolean plaidCompleted;
    boolean allowTruv;
    boolean allowPlaid;
  }

  private VerifyLinkContext loadAndTouchLink(Object rawToken) {
    VerifyLinkContext ctx = new VerifyLinkContext();
    String token = rawToken == null ? null : rawToken.toString();
    if (Strings.isEmpty(token)) {
      ctx.error = "Missing token";
      ctx.status = "not_found";
      return ctx;
    }

    Bundle lookup = new Bundle();
    Bean link = (Bean) lookup.find(com.mvu.loan.shared.entity.BorrowerVerificationLink.TYPE)
            .whereEquals(com.mvu.loan.shared.entity.BorrowerVerificationLink.token, token)
            .single();
    if (link == null) {
      ctx.error = "Link not found";
      ctx.status = "not_found";
      return ctx;
    }
    if (Boolean.TRUE.equals(link.get(com.mvu.loan.shared.entity.BorrowerVerificationLink.revoked))) {
      ctx.error = "Link revoked";
      ctx.status = "revoked";
      return ctx;
    }
    Date expiresAt = link.get(com.mvu.loan.shared.entity.BorrowerVerificationLink.expires_at);
    if (expiresAt != null && expiresAt.before(new Date())) {
      ctx.error = "Link expired";
      ctx.status = "expired";
      return ctx;
    }

    ctx.linkId = link.id();
    ctx.loanId = link.get(com.mvu.loan.shared.entity.BorrowerVerificationLink.transaction_id);
    ctx.borrowerId = link.get(com.mvu.loan.shared.entity.BorrowerVerificationLink.borrower_id);
    ctx.expiresAt = expiresAt;
    ctx.truvCompleted = link.get(com.mvu.loan.shared.entity.BorrowerVerificationLink.truv_completed_at) != null;
    ctx.plaidCompleted = link.get(com.mvu.loan.shared.entity.BorrowerVerificationLink.plaid_completed_at) != null;
    ctx.allowTruv = Boolean.TRUE.equals(link.get(com.mvu.loan.shared.entity.BorrowerVerificationLink.allow_truv));
    ctx.allowPlaid = Boolean.TRUE.equals(link.get(com.mvu.loan.shared.entity.BorrowerVerificationLink.allow_plaid));

    ctx.loan = lookup.get(Loan.TYPE, ctx.loanId);
    ctx.borrower = lookup.get(Borrower.TYPE, ctx.borrowerId);

    // The link should always reference a live loan, but a deleted-loan race
    // would otherwise NPE on the borrower-list dereference below. Surface as
    // not_found so the verify page renders the standard error state.
    if (ctx.loan == null) {
      ctx.error = "Loan not found";
      ctx.status = "not_found";
      return ctx;
    }

    // Resolve borrower's position on the loan (0 = primary)
    List<Long> borrowerIds = ctx.loan.get(Loan.borrowers);
    ctx.borrowerIndex = borrowerIds == null ? 0 : Math.max(0, borrowerIds.indexOf(ctx.borrowerId));

    // Touch audit fields — separate bundle so we don't mutate the lookup bundle.
    // Best-effort: failure here must not block the borrower from rendering the
    // verify page, but we log so we can spot persistent audit-write failures.
    try {
      Bundle touch = new Bundle();
      Bean touchLink = touch.get(com.mvu.loan.shared.entity.BorrowerVerificationLink.TYPE, ctx.linkId);
      touchLink.set(com.mvu.loan.shared.entity.BorrowerVerificationLink.last_accessed_at, new Date());
      Integer count = touchLink.get(com.mvu.loan.shared.entity.BorrowerVerificationLink.access_count);
      touchLink.set(com.mvu.loan.shared.entity.BorrowerVerificationLink.access_count, (count == null ? 0 : count) + 1);
      touchLink.save();
      touch.commit();
    } catch (Exception e) {
      LOG.warning(LOG_TAG_VERIFY + " loadAndTouchLink: audit-write failed linkId="
              + ctx.linkId + " err=" + e.getMessage());
    }

    ctx.status = "ok";
    return ctx;
  }

  /**
   * Stamps truv/plaid completion on the link and schedules a debounced LO SMS.
   * Debounce is memcache-backed (see {@link
   * com.mvu.loan.server.op.pylon.NotifyLOOfCompletedVerificationOp}): the
   * first completion writes a flag (TTL 10 min) and enqueues a 5-minute
   * delayed task; any later completion within the window sees the flag and
   * is a no-op, so a borrower who finishes Truv then Plaid gets one combined
   * SMS to the LO instead of two.
   */
  private void markCompletion(long linkId, boolean truv, boolean plaid) {
    try {
      Bundle b = new Bundle();
      Bean link = b.get(com.mvu.loan.shared.entity.BorrowerVerificationLink.TYPE, linkId);
      if (link == null) {
        LOG.warning(LOG_TAG_VERIFY + " markCompletion: link not found linkId=" + linkId);
        return;
      }
      // Re-check revoke/expiry inside the stamp path. The LO may revoke the
      // link between resolveVerifyLink (where loadAndTouchLink admitted the
      // borrower) and this sync call; without this guard a revoked link can
      // still record completion and trigger the LO notification.
      if (Boolean.TRUE.equals(link.get(com.mvu.loan.shared.entity.BorrowerVerificationLink.revoked))) {
        LOG.warning(LOG_TAG_VERIFY + " markCompletion: link revoked, skipping stamp linkId=" + linkId);
        return;
      }
      Date expiresAt = link.get(com.mvu.loan.shared.entity.BorrowerVerificationLink.expires_at);
      if (expiresAt != null && expiresAt.before(new Date())) {
        LOG.warning(LOG_TAG_VERIFY + " markCompletion: link expired, skipping stamp linkId=" + linkId);
        return;
      }
      Date now = new Date();
      if (truv && link.get(com.mvu.loan.shared.entity.BorrowerVerificationLink.truv_completed_at) == null) {
        link.set(com.mvu.loan.shared.entity.BorrowerVerificationLink.truv_completed_at, now);
      }
      if (plaid && link.get(com.mvu.loan.shared.entity.BorrowerVerificationLink.plaid_completed_at) == null) {
        link.set(com.mvu.loan.shared.entity.BorrowerVerificationLink.plaid_completed_at, now);
      }
      link.save();
      b.commit();

      com.mvu.loan.server.op.pylon.NotifyLOOfCompletedVerificationOp.enqueueIfFirst(linkId);
    } catch (Exception e) {
      LOG.warning(LOG_TAG_VERIFY + " markCompletion failed linkId=" + linkId
              + " truv=" + truv + " plaid=" + plaid + " err=" + e.getMessage());
    }
  }

  /**
   * Build the resolve response with masked borrower context + synced data.
   */
  private JSON buildResolveResponse(VerifyLinkContext ctx) {
    JSON out = JSON.empty();
    out.set("status", "ok");
    out.set("borrowerFirstName", ctx.borrower.get(Borrower.first_name));
    out.set("borrowerIndex", ctx.borrowerIndex);
    out.set("expiresAt", ctx.expiresAt);
    out.set("truvCompleted", ctx.truvCompleted);
    out.set("plaidCompleted", ctx.plaidCompleted);
    out.set("allowTruv", ctx.allowTruv);
    out.set("allowPlaid", ctx.allowPlaid);

    // Employments (for this borrower only) — masked
    List<HasValues> employments = ctx.borrower.get(Borrower.employments);
    List<JSON> maskedEmployments = new ArrayList<>();
    if (employments != null) {
      for (HasValues e : employments) {
        if (!e.hasValue(Employment.pylon_ids)) {
          continue; // only surface verified entries
        }
        JSON ej = JSON.empty();
        ej.set("employer_name", e.get(Employment.employer_name));
        ej.set("position", e.get(Employment.position));
        ej.set("income", e.get(Employment.income));
        ej.set("start_tz", e.get(Employment.start_date_tz));
        ej.set("end_tz", e.get(Employment.end_date_tz));
        ej.set("pylon_verified", e.get(Employment.pylon_verified));
        maskedEmployments.add(ej);
      }
    }
    out.set("employments", maskedEmployments);

    // Income from other sources (alimony, child support, social security, net
    // rental, dividends/interest, pension, etc.). These live on a separate list
    // (Borrower.other_incomes) from employment income, are self-reported on the
    // 1003, and are never Truv-verified — so they carry no verified/linked
    // status. Surfaced as a distinct array so the FE can render them under a
    // divider beneath the employment rows ("Other income" subsection).
    List<HasValues> otherIncomes = ctx.borrower.get(Borrower.other_incomes);
    List<JSON> maskedOtherIncomes = new ArrayList<>();
    if (otherIncomes != null) {
      for (HasValues oi : otherIncomes) {
        com.mvu.loan.shared.typekey.IncomeType type = oi.get(com.mvu.loan.shared.entity.Income.income_type);
        Double amount = oi.get(Employment.income);
        String description = oi.get(com.mvu.loan.shared.entity.Income.other_description);
        // Skip blank rows the borrower never filled in.
        if (type == null && (amount == null || amount == 0d) && Strings.isEmpty(description)) {
          continue;
        }
        // For the "Other" catch-all type, the borrower's free-text description
        // is the meaningful label; otherwise use the income type's display name.
        String label = type == com.mvu.loan.shared.typekey.IncomeType.Other && Strings.isNotEmpty(description)
                ? description
                : (type != null ? type.toString() : "Other income");
        JSON oj = JSON.empty();
        oj.set("type", label);
        oj.set("amount", amount);
        maskedOtherIncomes.add(oj);
      }
    }
    out.set("otherIncomes", maskedOtherIncomes);

    // Pylon-synced assets on the loan — masked account numbers, filtered to
    // the viewing borrower's ownership. Ownership is keyed on Asset.ssns (the
    // same field that drives the "Owners" column on the 1003), which
    // SyncPylonAssetOp now populates with the asset group's resolved owner SSN
    // and merges both SSNs for joint accounts (applyJointDedup). So Mary's
    // link must NOT surface an asset solely owned by John — that was a privacy
    // leak: a co-borrower could see the primary's accounts (and vice versa).
    //
    // We DO still show assets with no ssns recorded — those are the
    // ownership-unknown case (e.g. the owner had no SSN on file at sync time,
    // per SyncPylonAssetOp), where hiding could drop a borrower's own account.
    // Once a joint/co-borrower asset has its owner SSN(s) populated, this
    // filter shows it to exactly the borrowers who own it.
    String viewerSsn = normalizeSsn(ctx.borrower.get(Borrower.ssn));
    List<HasValues> loanAssets = ctx.loan.get(Loan.assets);
    List<JSON> maskedAssets = new ArrayList<>();
    if (loanAssets != null) {
      for (HasValues a : loanAssets) {
        if (a.get(com.mvu.loan.shared.entity.Asset.pylon_id) == null) {
          continue;
        }
        List<String> ownerSsns = a.get(com.mvu.loan.shared.entity.Asset.ssns);
        boolean ownershipKnown = ownerSsns != null && !ownerSsns.isEmpty();
        if (ownershipKnown && !ownedByViewer(ownerSsns, viewerSsn)) {
          // Asset is owned by other borrower(s) on the loan, not the viewer.
          continue;
        }
        JSON aj = JSON.empty();
        aj.set("name", a.get(com.mvu.loan.shared.entity.Asset.name));
        aj.set("account_number", maskAccountNumber(a.get(com.mvu.loan.shared.entity.Asset.account_number)));
        aj.set("asset_type", a.get(com.mvu.loan.shared.entity.Asset.asset_type) != null
                ? a.get(com.mvu.loan.shared.entity.Asset.asset_type).name() : null);
        aj.set("balance", a.get(com.mvu.loan.shared.entity.Asset.balance));
        aj.set("pylon_verified", a.get(com.mvu.loan.shared.entity.Asset.pylon_verified));
        maskedAssets.add(aj);
      }
    }
    out.set("assets", maskedAssets);

    Bean lo = com.mvu.loan.server.op.pylon.NotifyLOOfCompletedVerificationOp.pickLoanOfficer(ctx.loan);
    out.set("loContact", buildContactCard(lo, "Main Loan Officer"));
    out.set("lpContact", buildContactCard(ctx.loan.load(Loan.processor), "Processor"));
    return out;
  }

  private static JSON buildContactCard(Bean admin, String role) {
    if (admin == null) {
      return null;
    }
    JSON card = JSON.empty();
    card.set("name", admin.get(Admin.full_name));
    card.set("role", role);
    card.set("email", admin.get(Admin.company_email));
    card.set("phone", admin.get(Admin.company_phone));
    card.set("avatarUrl", admin.get(Admin.avatar_thumbnail));
    return card;
  }

  // ─── helpers for /public/todos/* ──────────────────────────────────

  /**
   * Resolved context for a valid {@code PylonTodoLink}.
   */
  private static final class TodoLinkContext {
    long linkId;
    long loanId;
    long borrowerId;
    Bean borrower;
    Bean loan;
    List<String> taskIds;
    Date expiresAt;
    String error;
    String status; // "ok" | "expired" | "revoked" | "not_found"
  }

  private TodoLinkContext loadAndTouchTodoLink(Object rawToken) {
    TodoLinkContext ctx = new TodoLinkContext();
    String token = rawToken == null ? null : rawToken.toString();
    if (Strings.isEmpty(token)) {
      ctx.error = "Missing token";
      ctx.status = "not_found";
      return ctx;
    }

    Bundle lookup = new Bundle();
    Bean link = (Bean) lookup.find(PylonTodoLink.TYPE)
            .whereEquals(PylonTodoLink.token, token)
            .single();
    if (link == null) {
      ctx.error = "Link not found";
      ctx.status = "not_found";
      return ctx;
    }
    if (Boolean.TRUE.equals(link.get(PylonTodoLink.revoked))) {
      ctx.error = "Link revoked";
      ctx.status = "revoked";
      return ctx;
    }
    Date expiresAt = link.get(PylonTodoLink.expires_at);
    if (expiresAt != null && expiresAt.before(new Date())) {
      ctx.error = "Link expired";
      ctx.status = "expired";
      return ctx;
    }

    ctx.linkId = link.id();
    ctx.loanId = link.get(PylonTodoLink.transaction_id);
    ctx.borrowerId = link.get(PylonTodoLink.borrower_id);
    ctx.taskIds = link.get(PylonTodoLink.task_ids);
    ctx.expiresAt = expiresAt;
    ctx.loan = lookup.get(Loan.TYPE, ctx.loanId);
    ctx.borrower = lookup.get(Borrower.TYPE, ctx.borrowerId);

    // Touch audit fields in a separate bundle so the lookup bundle stays clean.
    try {
      Bundle touch = new Bundle();
      Bean touchLink = touch.get(PylonTodoLink.TYPE, ctx.linkId);
      touchLink.set(PylonTodoLink.last_accessed_at, new Date());
      Integer count = touchLink.get(PylonTodoLink.access_count);
      touchLink.set(PylonTodoLink.access_count,
              (count == null ? 0 : count) + 1);
      touchLink.save();
      touch.commit();
    } catch (Exception ignored) {
    }

    ctx.status = "ok";
    return ctx;
  }

  /**
   * Builds the borrower-facing resolve payload — context, tasks, LO/LP contacts.
   */
  private JSON buildTodoResolveResponse(TodoLinkContext ctx) {
    Bundle bundle = new Bundle();
    JSON out = JSON.empty();
    out.set("status", "ok");
    out.set("borrowerFirstName", ctx.borrower.get(Borrower.first_name));
    out.set("borrowerFullName", ctx.borrower.get(com.mvu.core.shared.entity.Contact.full_name));
    out.set("expiresAt", ctx.expiresAt);

    // Pull the scoped task rows. Borrowers see only the tasks the LO put in
    // the link's task_ids — not every PylonLoanTaskItem on the loan.
    List<JSON> taskList = new ArrayList<>();
    if (ctx.taskIds != null && !ctx.taskIds.isEmpty()) {
      for (String pylonTaskId : ctx.taskIds) {
        if (Strings.isEmpty(pylonTaskId)) {
          continue;
        }
        Bean task = bundle.find(PylonLoanTaskItem.TYPE)
                .whereEquals(PylonLoanTaskItem.pylon_task_id, pylonTaskId)
                .first();
        if (task == null) {
          continue;
        }
        // Mirror of the cross-loan guard SendPylonTodoLinkOp applies when it builds
        // task_ids. The lookup above is by pylon_task_id alone, and
        // SyncPylonLoanTasksOp.populateCommonFields rewrites loan_id on an existing
        // row, so a Pylon id ever reissued against another loan would migrate the row
        // out from under links that still reference it. This endpoint is authorized by
        // a bearer token alone, so refuse to serve a row that has left this link's loan
        // rather than hand another file's title, note and Drive links to whoever holds
        // the link.
        Long taskLoanId = task.get(PylonLoanTaskItem.loan_id);
        if (taskLoanId != null && taskLoanId.longValue() != ctx.loanId) {
          continue;
        }
        JSON t = JSON.empty();
        t.set("pylon_task_id", task.get(PylonLoanTaskItem.pylon_task_id));
        t.set("title", task.get(PylonLoanTaskItem.title));
        t.set("customize_title", task.get(PylonLoanTaskItem.customize_title));
        t.set("task_type", task.get(PylonLoanTaskItem.task_type));
        t.set("status", task.get(PylonLoanTaskItem.status));
        t.set("priority", task.get(PylonLoanTaskItem.priority));
        t.set("due_date", task.get(PylonLoanTaskItem.due_date));
        t.set("note", task.get(PylonLoanTaskItem.note));
        t.set("borrower_facing_description", task.get(
                PylonLoanTaskItem.borrower_facing_description));
        t.set("is_manual", task.get(PylonLoanTaskItem.is_manual, false));
        t.set("is_completed", task.get(PylonLoanTaskItem.is_completed));
        t.set("uploaded_files", task.get(PylonLoanTaskItem.uploaded_files));
        t.set("borrower_name", task.get(PylonLoanTaskItem.borrower_name));
        t.set("borrower_id", task.get(PylonLoanTaskItem.borrower_id));
        // Which employer / asset account / other entity the request is about. Pylon
        // spawns one task per entity, so a loan with three brokerages produces three
        // rows whose titles are word-for-word identical ("...unredacted asset statements
        // covering the past 60 days"). Without this the borrower cannot tell them apart
        // and has no way to know which account each one wants. PylonLoanTaskItem.detail
        // documents entityDisplayName as exactly this discriminator, and the LO's
        // PylonTaskTable already badges it. Flattened rather than sending the whole
        // detail object, which also carries Pylon ids the page has no use for.
        HasValues taskDetail = task.get(PylonLoanTaskItem.detail);
        t.set("entity_display_name",
                taskDetail == null ? null : taskDetail.get("entityDisplayName", StringType.instance()));
        taskList.add(t);
      }
    }
    out.set("tasks", taskList);

    Bean lo = com.mvu.loan.server.op.pylon.NotifyLOOfCompletedVerificationOp.pickLoanOfficer(ctx.loan);
    out.set("loContact", buildContactCard(lo, "Main Loan Officer"));
    out.set("lpContact", buildContactCard(ctx.loan.load(Loan.processor), "Processor"));
    return out;
  }

  private static String maskAccountNumber(String raw) {
    if (Strings.isEmpty(raw)) {
      return null;
    }
    String digits = raw.replaceAll("\\D", "");
    if (digits.length() <= 4) {
      return "****" + digits;
    }
    return "****" + digits.substring(digits.length() - 4);
  }

  /**
   * Strips all non-digits from an SSN so ownership comparison is robust to
   * formatting drift (e.g. {@code 123-45-6789} vs {@code 123456789}). Both
   * {@code Asset.ssns} and {@code Borrower.ssn} are seeded from the same
   * {@code Borrower.ssn} values, but normalizing avoids any masked/dashed
   * mismatch silently hiding a borrower's own assets. Returns null if empty.
   */
  private static String normalizeSsn(String raw) {
    if (Strings.isEmpty(raw)) {
      return null;
    }
    String digits = raw.replaceAll("\\D", "");
    return digits.isEmpty() ? null : digits;
  }

  /**
   * True if {@code viewerSsn} matches any of the asset's owner SSNs. Covers
   * both sole ownership and joint accounts (where {@code ownerSsns} carries
   * every co-owner's SSN). False when the viewer has no SSN on file — we can't
   * prove ownership, so we don't leak another borrower's account to them.
   */
  private static boolean ownedByViewer(List<String> ownerSsns, String viewerSsn) {
    if (viewerSsn == null || ownerSsns == null) {
      return false;
    }
    for (String owner : ownerSsns) {
      if (viewerSsn.equals(normalizeSsn(owner))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Build the input JSON for delegating to an authenticated endpoint.
   *
   * <p>Bypasses {@link JSON#set(String, Object)} for numeric ids because the
   * typed path routes Long values through {@code LongType._toJson} which
   * stringifies them — the downstream endpoint then casts {@code getRaw} to
   * {@link Number} and throws {@link ClassCastException}. Writing to the raw
   * map preserves the boxed {@link Long} / {@link Integer}.</p>
   */
  private JSON delegatedFor(VerifyLinkContext ctx) {
    JSON out = JSON.empty();
    out.getMap().put("loanId", ctx.loanId);
    out.getMap().put("borrowerIndex", ctx.borrowerIndex);
    return out;
  }

  private static String pickNonEmpty(Object primary, Object fallback) {
    String p = primary == null ? null : primary.toString();
    if (Strings.isNotEmpty(p)) {
      return p;
    }
    return fallback == null ? null : fallback.toString();
  }


  // ---------------------------------------------------------------------------------------------
  // Technology Advisor registry
  //
  // Full CRUD on all three entities, plus one aggregate read that renders the whole page. Writes
  // are CONFIG-only except registerTechAdvisor, which always acts on the session user - so it can
  // never enrol a third party - and is bound by the per-person app cap (saveTechAdvisorConfig).
  // Managing somebody else's registration is a separate CONFIG call and bypasses the cap.
  // ---------------------------------------------------------------------------------------------

  @ApiMethod(name = "findTechApps", path = "{ns}/findTechApps", httpMethod = ApiMethod.HttpMethod.GET)
  public Object findTechApps(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      in.remove("ns");
      in.type(TechApp.TYPE);
      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getTechApp", path = "{ns}/getTechApp", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getTechApp(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      in.remove("ns");
      in.type(TechApp.TYPE);
      return OpRegistry.get(GetOp.class).execute(in);
    });
  }

  @ApiMethod(name = "saveTechApp", path = "{ns}/saveTechApp", httpMethod = ApiMethod.HttpMethod.POST)
  public Object saveTechApp(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      in.remove("ns");
      in.type(TechApp.TYPE);
      return OpRegistry.get(SaveTechAppOp.class).execute(in);
    });
  }

  @ApiMethod(name = "deleteTechApp", path = "{ns}/deleteTechApp", httpMethod = ApiMethod.HttpMethod.POST)
  public Object deleteTechApp(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      in.remove("ns");
      in.type(TechApp.TYPE);
      return OpRegistry.get(DeleteTechAppOp.class).execute(in);
    });
  }

  @ApiMethod(name = "findTechAppFeatures", path = "{ns}/findTechAppFeatures", httpMethod = ApiMethod.HttpMethod.GET)
  public Object findTechAppFeatures(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      in.remove("ns");
      in.type(TechAppFeature.TYPE);
      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  @ApiMethod(name = "getTechAppFeature", path = "{ns}/getTechAppFeature", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getTechAppFeature(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      in.remove("ns");
      in.type(TechAppFeature.TYPE);
      return OpRegistry.get(GetOp.class).execute(in);
    });
  }

  @ApiMethod(name = "saveTechAppFeature", path = "{ns}/saveTechAppFeature", httpMethod = ApiMethod.HttpMethod.POST)
  public Object saveTechAppFeature(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      in.remove("ns");
      in.type(TechAppFeature.TYPE);
      return OpRegistry.get(SaveOp.class).execute(in);
    });
  }

  @ApiMethod(name = "deleteTechAppFeature", path = "{ns}/deleteTechAppFeature", httpMethod = ApiMethod.HttpMethod.POST)
  public Object deleteTechAppFeature(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      in.remove("ns");
      in.type(TechAppFeature.TYPE);
      return OpRegistry.get(DeleteTechAppFeatureOp.class).execute(in);
    });
  }

  @ApiMethod(name = "findTechAdvisorRegistrations", path = "{ns}/findTechAdvisorRegistrations", httpMethod = ApiMethod.HttpMethod.GET)
  public Object findTechAdvisorRegistrations(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      in.remove("ns");
      in.type(TechAdvisorRegistration.TYPE);
      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  /** Same as findTechAdvisorRegistrations, but the advisor is forced to the caller. */
  @ApiMethod(name = "getMyTechAdvisorRoles", path = "{ns}/getMyTechAdvisorRoles", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getMyTechAdvisorRoles(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      in.remove("ns");
      in.type(TechAdvisorRegistration.TYPE);
      in.set(TechAdvisorRegistration.admin, Server.currentUserKey());
      return OpRegistry.get(FindOp.class).execute(in);
    });
  }

  @ApiMethod(name = "registerTechAdvisor", path = "{ns}/registerTechAdvisor", httpMethod = ApiMethod.HttpMethod.POST)
  public Object registerTechAdvisor(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      in.remove("ns");
      return OpRegistry.get(RegisterTechAdvisorOp.class).execute(in);
    });
  }

  /** CONFIG only: enrol somebody else. registerTechAdvisor can never do this. */
  @ApiMethod(name = "saveTechAdvisorRegistration", path = "{ns}/saveTechAdvisorRegistration", httpMethod = ApiMethod.HttpMethod.POST)
  public Object saveTechAdvisorRegistration(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      in.remove("ns");
      in.type(TechAdvisorRegistration.TYPE);
      return OpRegistry.get(SaveOp.class).execute(in);
    });
  }

  /** CONFIG only: remove somebody else's registration. */
  @ApiMethod(name = "deleteTechAdvisorRegistration", path = "{ns}/deleteTechAdvisorRegistration", httpMethod = ApiMethod.HttpMethod.POST)
  public Object deleteTechAdvisorRegistration(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      in.remove("ns");
      // DeleteOp gates on canRead, and this entity is readable by every logged-in user, so the
      // CONFIG check cannot come from the op or the entity policy - it has to happen here.
      if (!App.hasPermission(Permission.CONFIG)) {
        throw new ErrorMessage("Invalid permission");
      }
      in.type(TechAdvisorRegistration.TYPE);
      return OpRegistry.get(DeleteOp.class).execute(in);
    });
  }

  /** CONFIG only: registry-wide settings - today the number of apps one person may advise. */
  @ApiMethod(name = "saveTechAdvisorConfig", path = "{ns}/saveTechAdvisorConfig", httpMethod = ApiMethod.HttpMethod.POST)
  public Object saveTechAdvisorConfig(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      in.remove("ns");
      return OpRegistry.get(SaveTechAdvisorConfigOp.class).execute(in);
    });
  }

  /** The whole registry page in one call: apps, features, advisors, devs, POs and caller rights. */
  @ApiMethod(name = "getTechAppRegistry", path = "{ns}/getTechAppRegistry", httpMethod = ApiMethod.HttpMethod.GET)
  public Object getTechAppRegistry(HttpServletRequest req, @Named("ns") String ns, JSON input) throws ServiceException {
    return handleRequest(input, in -> {
      beforeRequest(req, ns, extractLOEmail(input), true);
      in.remove("ns");
      return OpRegistry.get(GetTechAppRegistryOp.class).execute(in);
    });
  }
}
