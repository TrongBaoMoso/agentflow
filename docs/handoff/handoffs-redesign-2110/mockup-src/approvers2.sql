\pset pager off
select g.email, g.role_codes, g.overrides_add, g.overrides_block
from rbac_grants g
where (g.role_codes ?| array['MANAGER','ADMIN'] or g.overrides_add ?| array['OFFER_APPROVE','*'])
order by g.email;
select (select count(*) from rbac_grants) grants_total,
       (select count(*) from offers where status='PENDING_APPROVAL') pending_now,
       (select count(*) from offer_history where event_type='APPROVED') approved_events;
