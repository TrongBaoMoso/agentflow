package com.mvu.loan.server.op.cron;

import java.util.Arrays;
import java.util.Date;
import java.util.List;

import com.mvu.appengine.db.Bean;
import com.mvu.appengine.db.Bundle;
import com.mvu.appengine.server.op.BaseCronOp;
import com.mvu.core.server.JSON;
import com.mvu.core.server.util.ServerDateUtils;
import com.mvu.core.shared.datatype.IntegerType;
import com.mvu.core.shared.field.Field;
import com.mvu.core.shared.typekey.CompareType;
import com.mvu.core.shared.util.Dates;
import com.mvu.loan.shared.PerformanceReportUtils;
import com.mvu.loan.shared.entity.Admin;
import com.mvu.loan.shared.entity.CountingType;
import com.mvu.loan.shared.entity.LORecruiting;
import com.mvu.loan.shared.entity.PerformanceReport;
import com.mvu.loan.shared.entity.WebinarAttendeeStatus;

import static com.mvu.loan.shared.PerformanceReportUtils.monthCountField;

public class GenerateMonthlyReferILORecruiterCronOp extends BaseCronOp {
  protected Date firstDayOfMonth;
  protected Date firstDayOfLastMonth;
  protected String monthId;

  @Override
  protected void processItem(Bean admin, Date now) throws Exception {
    calculate(bundle, admin, firstDayOfLastMonth, firstDayOfMonth, monthId);
  }

  /**
   * One Admin's monthly "ILOs referred by recruiter" row. Staff recruiters (HR flags) always get a row. A Loan
   * Officer credited through the LO Recruiter Program has no flag, so is counted only when leads carry
   * {@code recruiter=<their key>} in the month: no leads, no row, and no flag is ever set.
   */
  public static void calculate(Bundle bundle, Bean admin, Date firstDayOfLastMonth, Date firstDayOfMonth, String monthId) {
    boolean staffRecruiter = admin.is(Admin.is_recruiter) || admin.is(Admin.is_out_sourcing_recruiter);
    if (!staffRecruiter && !admin.is(Admin.is_loan_originator)) {
      return;
    }
    List<Bean> ilos = bundle.find(LORecruiting.TYPE)
            .whereEquals(LORecruiting.recruiting_type, LORecruiting.RecruitingType.interested)
            .whereEquals(LORecruiting.recruiter, admin.keyName())
            .where(LORecruiting.created, CompareType.GREATER_THAN_OR_EQUAL, firstDayOfLastMonth)
            .where(LORecruiting.created, CompareType.LESS_THAN, firstDayOfMonth)
            .list();
    if (!staffRecruiter && ilos.isEmpty()) {
      return;
    }

    Bean report = ensureRecruiterReport(bundle, admin);
    if (!ilos.isEmpty()) {
      report.set(monthTotalField(monthId), ilos.size());
      int count = ilos.stream()
              .filter(ilo -> Arrays.asList(WebinarAttendeeStatus.interviewed_and_accepted, WebinarAttendeeStatus.joined)
                      .contains(ilo.get(LORecruiting.status))).toList().size();
      report.set(monthCountField(monthId), count);
    } else {
      report.set(monthCountField(monthId), 0);
      report.set(monthTotalField(monthId), 0);
    }
  }

  @Override
  public Iterable<Bean> findItems(JSON input, Date now) {
    setDateCronOp();
    return bundle.find(Admin.TYPE)
            .whereEquals(Admin.active, true);
  }

  @Override
  protected boolean allowToRunInNS(String ns) {
    return isActiveCompany(ns);
  }

  protected void setDateCronOp() {
    firstDayOfMonth = Dates.dates.removeTime(Dates.dates.setToFirstDayOfMonth(runDate()));
    firstDayOfLastMonth = Dates.dates.addMonths(firstDayOfMonth, -1);
    monthId = Dates.dates.getMonthId(Dates.dates.addMonths(ServerDateUtils.setDay(runDate(), 1), -1));
  }

  private static Bean ensureRecruiterReport(Bundle bundle, Bean admin) {
    String reportKeyName = PerformanceReportUtils.getReportKeyName(CountingType.ilo_refer_by_recruiter, admin.keyName());
    Bean report = bundle.ensure(PerformanceReport.TYPE, reportKeyName);
    if (report.isNew()) {
      report.set(PerformanceReport.container, admin.key());
      report.set(PerformanceReport.counting_type, CountingType.ilo_refer_by_recruiter);
    }
    report.set(PerformanceReport.name, admin.get(Admin.full_name));
    return report;
  }

  public static Field<Integer> monthTotalField(String monthId) {
    return new Field<>("TOTAL" + monthId, monthId, IntegerType.instance());
  }
}
