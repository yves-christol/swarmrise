import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useOrgaStore } from '../../tools/orgaStore'
import { Id } from '../../../convex/_generated/dataModel'

export const OrgaSelector = () => {
  const { selectedOrgaId, selectOrga } = useOrgaStore()
  const orgasWithCounts = useQuery(api.orgas.functions.listMyOrgasWithCounts)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (value === "") {
      selectOrga(null)
    } else {
      selectOrga(value as Id<"orgas">)
    }
  }

  if (!orgasWithCounts) {
    return <div>Loading organizations...</div>
  }

  if (orgasWithCounts.length === 0) {
    return <div>No organizations found</div>
  }

  return (
    <select
      value={selectedOrgaId ?? ""}
      onChange={handleChange}
      style={{
        padding: '8px 12px',
        fontSize: '16px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        minWidth: '200px',
      }}
    >
      <option value="">Select an organization</option>
      {orgasWithCounts.map(({ orga, counts }) => (
        <option key={orga._id} value={orga._id}>
          {orga.name} ({counts.members} members, {counts.teams} teams, {counts.roles} roles)
        </option>
      ))}
    </select>
  )
}
