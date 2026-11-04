package com.mvu.loan.server.op.user;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;

import com.mvu.appengine.db.Bean;
import com.mvu.appengine.server.NotificationFactory;
import com.mvu.appengine.server.op.AppEngineOp;
import com.mvu.appengine.server.op.EmailTemplateOp;
import com.mvu.core.server.JSON;
import com.mvu.core.server.RequiresPermissions;
import com.mvu.core.server.Server;
import com.mvu.core.shared.field.FK;
import com.mvu.core.shared.field.Field;
import com.mvu.core.shared.util.Colls;
import com.mvu.loan.shared.ChannelsFilter;
import com.mvu.loan.server.op.recruiting.LoRecruiterProgramStanding;
import com.mvu.loan.shared.entity.Admin;
import com.mvu.loan.shared.entity.Company;
import com.mvu.loan.shared.entity.ILOAssignmentOwner;
import com.mvu.loan.shared.entity.LORecruiting;

@RequiresPermissions()
public class ILOAutomaticAssignOwnerOp extends AppEngineOp {
  private String onboardSpecialistEmail = "";
  private String supportSpecialistEmail = "";
  private String recruiterEmail = "";


  @Override
  public Object execute(JSON input) throws Exception {
    Bean lORecruiting = bundle.find(LORecruiting.TYPE)
            .whereEquals(LORecruiting.key, input.key())
            .first();
    Bean assignOwnerConfig = bundle.find(ILOAssignmentOwner.TYPE).whereEquals(ILOAssignmentOwner.id, 1L).first();
    List<Bean> admin = bundle.find(Admin.TYPE)
            .whereEquals(Admin.available, true)
            .whereEquals(Admin.active, true)
            .orderBy(Company.LOAN_FACTORY.equals(Server.namespace()) ? Admin.employee_start_date : Admin.created, true)
            .list();

    if (assignOwnerConfig != null && assignOwnerConfig.is(ILOAssignmentOwner.is_automatic_assignment)) {
      // A specialist already on the row was chosen on purpose: recruit-be writes the one it
      // assigned in the same save that creates the row, and this task runs after it. Keep it, and
      // skip the round-robin entirely rather than taking a turn nobody receives.
      boolean hasOnboardingSpecialist = lORecruiting != null && lORecruiting.hasValue(LORecruiting.onboarding_specialist);
      Bean onBoardingSpecialists = hasOnboardingSpecialist ? null
              : checkAndClearAssignConfig(admin, Admin.is_onboarding_specialist, assignOwnerConfig, ILOAssignmentOwner.onboard_specialist);
      Bean onSupportSpecialists = checkAndClearAssignConfig(admin, Admin.is_support_specialist, assignOwnerConfig, ILOAssignmentOwner.support_specialist);
      // A program member's recruiter credit (a Loan Officer, not a staff recruiter) is never overwritten by the
      // staff round-robin, and the round-robin does not burn a turn on it.
      boolean keepsMemberCredit = LoRecruiterProgramStanding.holdsProgramMemberCredit(lORecruiting);
      Bean onRecruiters = keepsMemberCredit ? null
              : checkAndClearAssignConfig(admin, Admin.is_out_sourcing_recruiter, assignOwnerConfig, ILOAssignmentOwner.recruiter);

      if (onBoardingSpecialists != null && assignOwnerConfig.is(ILOAssignmentOwner.is_automatic_assigment_onboarding_specialist)) {
        assignOwner(lORecruiting, onBoardingSpecialists, LORecruiting.onboarding_specialist);
      }
      if (onSupportSpecialists != null && assignOwnerConfig.is(ILOAssignmentOwner.is_automatic_assigment_support_specialist)) {
        assignOwner(lORecruiting, onSupportSpecialists, LORecruiting.support_specialist);
      }
      if (onRecruiters != null && assignOwnerConfig.is(ILOAssignmentOwner.is_automatic_assigment_recruiter)) {
        assignOwner(lORecruiting, onRecruiters, LORecruiting.recruiter);
      }
      sendEmails(lORecruiting, onboardSpecialistEmail, supportSpecialistEmail, recruiterEmail);
      return lORecruiting;
    }
    return null;
  }

  private Bean checkAndClearAssignConfig(List<Bean> adminList, Field<Boolean> type, Bean assignOwnerConfig, Field<List<String>> configRole) {
    List<Bean> filteredAdminList = adminList.stream()
            .filter(admin -> admin.is(type))
            .collect(Collectors.toList());

    List<String> isAssignedConfigKeys = assignOwnerConfig.get(configRole);
    List<String> assignKeys = filteredAdminList.stream()
            .map(Bean::keyName)
            .collect(Collectors.toList());

    if (!assignKeys.isEmpty()) {
      List<String> keysToRemove = new ArrayList<>(assignKeys);
      if (Colls.isNotEmpty(isAssignedConfigKeys)) {
        keysToRemove.removeAll(isAssignedConfigKeys);
      }
      isAssignedConfigKeys = keysToRemove.isEmpty() || Colls.isEmpty(isAssignedConfigKeys) ? new ArrayList<>() : isAssignedConfigKeys;
      String keyToAssign = keysToRemove.isEmpty() ? assignKeys.get(0) : keysToRemove.get(0);
      isAssignedConfigKeys.add(keyToAssign);
      assignOwnerConfig.set(configRole, isAssignedConfigKeys).saveAndRefresh();
      filteredAdminList = filteredAdminList.stream()
              .filter(admin -> admin.keyName().equals(keyToAssign))
              .collect(Collectors.toList());
    }
    return filteredAdminList.stream().findFirst().orElse(null);
  }
  private void assignOwner(Bean lORecruiting, Bean assignOwner, FK<String> ownerField) {
    lORecruiting.set(ownerField, assignOwner.get(Admin.keyName)).save();
    createNotification(assignOwner.key(), lORecruiting.get(LORecruiting.full_name));
    setEmail(assignOwner, ownerField);
  }

  private void setEmail(Bean owner, FK<String> ownerField) {
    String companyEmail = owner.get(Admin.company_email);
    if (ownerField.equals(LORecruiting.onboarding_specialist)) {
      onboardSpecialistEmail = companyEmail;
    } else if (ownerField.equals(LORecruiting.support_specialist)) {
      supportSpecialistEmail = companyEmail;
    } else if (ownerField.equals(LORecruiting.recruiter)) {
      recruiterEmail = companyEmail;
    }
  }

  private void sendEmails(Bean lORecruiting, String onboardSpecialistEmail, String supportSpecialistEmail, String recruiterEmail) throws Exception {
    HashMap<String, Object> context = new HashMap<>();
    context.put("root", lORecruiting.key());
    context.put("onboardSpecialistEmail", onboardSpecialistEmail);
    context.put("supportSpecialistEmail", supportSpecialistEmail);
    context.put("recruiterEmail", recruiterEmail);
    getOp(EmailTemplateOp.class).sendUsingTemplate("ilo_automatic_assign_owner", context);
  }

  protected void createNotification(String ownerKey, String adminFullName) {
    String type = "lo_recruiting/Mine";
    String title = "[Interested Loan Officers] " + adminFullName + " is assigned to you";
    new NotificationFactory()
            .owners(Collections.singletonList(ownerKey))
            .title(title)
            .channel(ChannelsFilter.INTERESTED_LOAN_OFFICER)
            .target(type)
            .action("View").push();
  }
}
