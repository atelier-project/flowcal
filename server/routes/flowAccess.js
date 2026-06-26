// SQL predicates that reproduce the Supabase "Flows: *" RLS policies.
// Each is written against `flows f` joined to `profiles p` (the owner), with
// bind params: $1 = current user id, $2 = is-admin boolean.
//
// Keeping these as shared fragments means view/update/delete stay consistent
// with the original policy definitions in supabase_schema.sql.

const isTeamMember = `
    f.team_id is not null and exists (
        select 1 from team_members tm
        where tm.team_id = f.team_id and tm.user_id = $1
    )`;

const isTeamRole = (roles) => `
    f.team_id is not null and exists (
        select 1 from team_members tm
        where tm.team_id = f.team_id and tm.user_id = $1
          and tm.role in (${roles})
    )`;

// SELECT: owner, team member, public, or admin-with-support-access.
export const CAN_VIEW = `(
    f.owner_id = $1
    or (${isTeamMember})
    or f.is_public = true
    or ($2::boolean and p.support_access_granted = true)
)`;

// UPDATE: owner, or team owner/admin.
export const CAN_UPDATE = `(
    f.owner_id = $1
    or (${isTeamRole("'owner', 'admin'")})
)`;

// DELETE: owner, or team owner only.
export const CAN_DELETE = `(
    f.owner_id = $1
    or (${isTeamRole("'owner'")})
)`;
