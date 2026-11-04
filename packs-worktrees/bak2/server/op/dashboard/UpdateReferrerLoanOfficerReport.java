package com.mvu.loan.server.op.dashboard;

import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

import com.mvu.appengine.db.Bean;
import com.mvu.appengine.db.Bundle;
import com.mvu.appengine.server.op.AppEngineOp;
import com.mvu.core.server.JSON;
import com.mvu.core.server.RequiresPermissions;
import com.mvu.core.shared.util.Dates;
import com.mvu.loan.shared.PerformanceReportUtils;
import com.mvu.loan.shared.entity.Admin;
import com.mvu.loan.shared.entity.CountingType;
import com.mvu.loan.shared.entity.LORecruiting;
import com.mvu.loan.shared.entity.PerformanceReport;

@RequiresPermissions()
public class UpdateReferrerLoanOfficerReport extends AppEngineOp {
  @Override
  public Boolean execute(JSON input) throws Exception {
    init();
    List<Bean> ilos = bundle.find(LORecruiting.TYPE)
            .whereEquals(LORecruiting.recruiting_type, LORecruiting.RecruitingType.interested)
            .list();
    List<Bean> recruiters = reportRecruiters(bundle.find(Admin.TYPE)
            .whereEquals(Admin.active, true)
            .list(), ilos);

    recruiters.forEach(recruiter -> {
      calculateReport(recruiter, ilos);
    });
    bundle.commit();
    return true;
  }

  /**
   * Who gets a row: every staff recruiter (HR flags), plus any active Loan Officer that leads are credited to
   * ({@code recruiter=<their key>}) through the LO Recruiter Program, who has no flag. Never sets a flag.
   */
  public static List<Bean> reportRecruiters(List<Bean> activeAdmins, List<Bean> ilos) {
    java.util.Set<String> creditedKeys = ilos.stream()
            .filter(ilo -> ilo.hasValue(LORecruiting.recruiter) && ilo.is(LORecruiting.lead_origin_recruiter_credit))
            .map(ilo -> ilo.get(LORecruiting.recruiter))
            .collect(Collectors.toSet());
    return activeAdmins.stream()
            .filter(item -> item.is(Admin.is_recruiter) || item.is(Admin.is_out_sourcing_recruiter)
                    || (item.is(Admin.is_loan_originator) && creditedKeys.contains(item.keyName())))
            .collect(Collectors.toList());
  }

  private void init() {
    bundle.find(PerformanceReport.TYPE)
            .whereEquals(PerformanceReport.counting_type, CountingType.referrer_lo_detail)
            .update(item -> {
              PerformanceReport.REFERRER_LO_MAP.forEach((key, value) -> {
                item.set(key, 0);
              });
              item.set(PerformanceReport.referrer_lo_past_due, 0);
              item.set(PerformanceReport.active, false);
              return true;
            });
  }

  private void calculateReport(Bean admin, List<Bean> ilos) {
    Bean report = ensureLoanOfficerReport(bundle, admin.keyName());
    // A non-staff Loan Officer is credited only for leads the server marked as program credit (manual assignments,
    // CSV imports and any forged value carry no marker); staff recruiters keep every lead assigned to them.
    boolean staff = admin.is(Admin.is_recruiter) || admin.is(Admin.is_out_sourcing_recruiter);
    ilos = ilos.stream().filter(ilo -> ilo.hasValue(LORecruiting.recruiter) && ilo.get(LORecruiting.recruiter).equals(admin.keyName())
            && (staff || ilo.is(LORecruiting.lead_origin_recruiter_credit))).collect(Collectors.toList());

    report.set(PerformanceReport.container, admin.key());
    report.set(PerformanceReport.counting_type, CountingType.referrer_lo_detail);
    report.set(PerformanceReport.name, admin.get(Admin.full_name));
    List<Bean> finalIlos = ilos;
    PerformanceReport.REFERRER_LO_MAP.forEach((key, value) -> {
      report.set(key,
              finalIlos.stream().filter(ilo -> ilo.is(LORecruiting.status, value)).collect(Collectors.toList()).size());
    });
    report.set(PerformanceReport.referrer_lo_past_due,
            ilos.stream().filter(ilo -> ilo.hasValue(LORecruiting.wakeup_date_tz) && Dates.dates.getDateFromISOString(ilo.get(LORecruiting.wakeup_date_tz)).before(Dates.dates.addDays(Dates.dates.removeTime(new Date()), 1)))
            .collect(Collectors.toList()).size());
    report.set(PerformanceReport.active, true);
  }

  private Bean ensureLoanOfficerReport(Bundle bundle, String adminKeyName) {
    String reportKeyName = PerformanceReportUtils.getReportKeyName(CountingType.referrer_lo_detail, adminKeyName);
    Bean report = bundle.ensure(PerformanceReport.TYPE, reportKeyName);
    return report;
  }
}
