import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrgaStore } from '../../tools/orgaStore'
import { Id } from '../../../convex/_generated/dataModel'
import { CreateOrganizationModal } from '../CreateOrganizationModal'

// Inline SVG icons to avoid external dependencies
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
  </svg>
)

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
  </svg>
)

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
  </svg>
)

// Placeholder icon for orgs without logos
const OrgPlaceholderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
  </svg>
)

// Spinner icon for switching state
const SpinnerIcon = ({ className }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
)

export const OrgaSelector = () => {
  const { t } = useTranslation('orgs')
  const { selectedOrgaId, selectedOrga, selectOrga, orgasWithCounts, isLoading, hasOrgas, isSwitchingOrga } = useOrgaStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      triggerRef.current?.focus()
    }
  }, [])

  const handleSelectOrga = (orgaId: Id<"orgas">) => {
    selectOrga(orgaId)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="w-6 h-6 rounded bg-gray-600" />
        <div className="w-24 h-4 rounded bg-gray-600" />
      </div>
    )
  }

  // Empty state - show placeholder in header
  if (!hasOrgas) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <OrgPlaceholderIcon className="w-5 h-5" />
        <span className="text-sm">{t('noOrganization')}</span>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitchingOrga}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-[#eac840] focus:ring-offset-2 focus:ring-offset-light dark:focus:ring-offset-dark
          ${isSwitchingOrga ? 'opacity-75 cursor-wait' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="orga-selector-dropdown"
        aria-busy={isSwitchingOrga}
      >
        {isSwitchingOrga ? (
          <SpinnerIcon className="w-5 h-5 text-gray-400" />
        ) : selectedOrga?.logoUrl ? (
          <img
            src={selectedOrga.logoUrl}
            alt=""
            className="w-6 h-6 rounded object-contain"
          />
        ) : (
          <OrgPlaceholderIcon className="w-5 h-5 text-gray-400" />
        )}
        <span className="font-swarm text-dark dark:text-light max-w-[160px] truncate">
          {isSwitchingOrga ? t('switching') : (selectedOrga?.name ?? t('selectOrganization'))}
        </span>
        {!isSwitchingOrga && (
          <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          id="orga-selector-dropdown"
          role="listbox"
          aria-label="Select organization"
          className="absolute top-full left-0 mt-1 w-72
            bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50"
        >
          {/* Organization list */}
          <div className="py-1">
            {orgasWithCounts?.map(({ orga, counts }) => {
              const isSelected = orga._id === selectedOrgaId
              return (
                <button
                  key={orga._id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectOrga(orga._id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5
                    transition-colors text-left
                    ${isSelected ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {orga.logoUrl ? (
                    <img
                      src={orga.logoUrl}
                      alt=""
                      className="w-8 h-8 rounded object-contain flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <OrgPlaceholderIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-dark dark:text-light truncate">{orga.name}</div>
                    <div className="text-xs text-gray-400">
                      {t('metrics.memberCount', { count: counts.members })}, {t('metrics.teamCount', { count: counts.teams })}
                    </div>
                  </div>
                  {isSelected && (
                    <CheckIcon className="w-5 h-5 text-gold flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* Create new organization */}
          <button
            onClick={() => {
              setIsOpen(false)
              setIsCreateModalOpen(true)
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5
              hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left text-gray-500 dark:text-gray-400"
          >
            <div className="w-8 h-8 rounded border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
              <PlusIcon className="w-5 h-5" />
            </div>
            <span>{t('createNewOrganization')}</span>
          </button>
        </div>
      )}

      <CreateOrganizationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  )
}
