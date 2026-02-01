import { OrgaSelector } from '../../components/OrgaSelector'
import { useOrgaStore, useMembers, useTeams, useRoles } from '../../tools/orgaStore'

export const RawDataPage = () => {
  const { selectedOrgaId } = useOrgaStore()
  const members = useMembers()
  const teams = useTeams()
  const roles = useRoles()

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Raw Data View</h1>

      <div style={{ marginBottom: '20px' }}>
        <OrgaSelector />
      </div>

      {!selectedOrgaId && (
        <p>Select an organization to view its data.</p>
      )}

      {selectedOrgaId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <section>
            <h2>Members ({members?.length ?? 0})</h2>
            {members === undefined ? (
              <p>Loading members...</p>
            ) : members.length === 0 ? (
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
            {teams === undefined ? (
              <p>Loading teams...</p>
            ) : teams.length === 0 ? (
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
            {roles === undefined ? (
              <p>Loading roles...</p>
            ) : roles.length === 0 ? (
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
