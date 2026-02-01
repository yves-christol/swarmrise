import { OrgaSelector } from '../../components/OrgaSelector'
import { useOrgaStore, useMembers, useTeams, useRoles } from '../../tools/orgaStore'

// Spinner component for loading states
const Spinner = () => (
  <div className="flex items-center gap-2">
    <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>Loading...</span>
  </div>
)

export const RawDataPage = () => {
  const { selectedOrgaId, isSwitchingOrga } = useOrgaStore()
  const { data: members, isLoading: membersLoading } = useMembers()
  const { data: teams, isLoading: teamsLoading } = useTeams()
  const { data: roles, isLoading: rolesLoading } = useRoles()

  // Show a global loading indicator when switching organizations
  const isTransitioning = isSwitchingOrga || (selectedOrgaId && (membersLoading || teamsLoading || rolesLoading))

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Raw Data View</h1>

      <div style={{ marginBottom: '20px' }}>
        <OrgaSelector />
      </div>

      {!selectedOrgaId && (
        <p>Select an organization to view its data.</p>
      )}

      {selectedOrgaId && isTransitioning && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Spinner />
          <p className="text-gray-400">Loading organization data...</p>
        </div>
      )}

      {selectedOrgaId && !isTransitioning && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <section>
            <h2>Members ({members?.length ?? 0})</h2>
            {membersLoading ? (
              <Spinner />
            ) : !members || members.length === 0 ? (
              <p>No members found.</p>
            ) : (
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Roles</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member._id}>
                      <td style={tdStyle}>{member._id}</td>
                      <td style={tdStyle}>{member.firstname} {member.surname}</td>
                      <td style={tdStyle}>{member.email}</td>
                      <td style={tdStyle}>{member.roleIds.length} role(s)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2>Teams ({teams?.length ?? 0})</h2>
            {teamsLoading ? (
              <Spinner />
            ) : !teams || teams.length === 0 ? (
              <p>No teams found.</p>
            ) : (
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team) => (
                    <tr key={team._id}>
                      <td style={tdStyle}>{team._id}</td>
                      <td style={tdStyle}>{team.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2>Roles ({roles?.length ?? 0})</h2>
            {rolesLoading ? (
              <Spinner />
            ) : !roles || roles.length === 0 ? (
              <p>No roles found.</p>
            ) : (
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Title</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Team ID</th>
                    <th style={thStyle}>Member ID</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role._id}>
                      <td style={tdStyle}>{role._id}</td>
                      <td style={tdStyle}>{role.title}</td>
                      <td style={tdStyle}>{role.roleType ?? '-'}</td>
                      <td style={tdStyle}>{role.teamId}</td>
                      <td style={tdStyle}>{role.memberId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: '8px',
  textAlign: 'left',
  backgroundColor: '#f4f4f4',
}

const tdStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: '8px',
}
