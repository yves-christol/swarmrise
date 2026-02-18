import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useOrgaStore } from '../../tools/orgaStore'
import { useFocus } from '../../tools/orgaStore/hooks'
import { Id } from '../../../convex/_generated/dataModel'
import { CreateOrganizationModal } from '../CreateOrganizationModal'
import { SpinnerIcon, CheckIcon, PlusIcon } from '../Icons'
import { routes } from '../../routes'

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
  </svg>
)

const OrgPlaceholderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
  </svg>
)

export const OrgaSelector = () => {
  const { t } = useTranslation('orgs')
  const navigate = useNavigate()
  const { selectedOrgaId, selectedOrga, selectOrga, orgasWithCounts, isLoading, hasOrgas, isSwitchingOrga } = useOrgaStore()
  const { focus, focusOnOrga } = useFocus()
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
    // Only navigate if switching to a different org
    if (orgaId !== selectedOrgaId) {
      selectOrga(orgaId)
      // Navigate to the new org's root (will trigger "You come first" redirect if enabled)
      void navigate(routes.orga(orgaId))
    }
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="w-6 h-6 rounded bg-gray-300 dark:bg-gray-600" />
        <div className="w-24 h-4 rounded bg-gray-300 dark:bg-gray-600" />
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
      {/* Split button: main area focuses orga, chevron opens dropdown */}
      <div
        className={`flex items-center rounded-md transition-colors
          ${isSwitchingOrga ? 'opacity-75 cursor-wait' : ''}`}
      >
        <button
          ref={triggerRef}
          onClick={() => {
            if (focus.type !== "orga") {
              focusOnOrga()
            }
          }}
          disabled={isSwitchingOrga}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-l-md transition-colors
            focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-2 focus:ring-offset-light dark:focus:ring-offset-dark
            ${isSwitchingOrga ? '' : 'hover:bg-surface-hover-strong'}
            ${focus.type === "orga" ? '' : 'cursor-pointer'}`}
          aria-label={selectedOrga?.name ?? t('selectOrganization')}
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
          <span className="font-title text-dark dark:text-light max-w-[160px] truncate">
            {isSwitchingOrga ? t('switching') : (selectedOrga?.name ?? t('selectOrganization'))}
          </span>
        </button>
        {!isSwitchingOrga && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center py-1.5 pr-2 pl-1 rounded-r-md transition-colors
              focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-2 focus:ring-offset-light dark:focus:ring-offset-dark
              hover:bg-surface-hover-strong"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls="orga-selector-dropdown"
          >
            <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          id="orga-selector-dropdown"
          role="listbox"
          aria-label="Select organization"
          className="absolute top-full left-0 mt-1 w-72
            bg-surface-primary border border-border-default rounded-lg shadow-xl z-50"
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
                    ${isSelected ? 'bg-surface-secondary' : 'hover:bg-surface-hover'}`}
                >
                  {orga.logoUrl ? (
                    <img
                      src={orga.logoUrl}
                      alt=""
                      className="w-8 h-8 rounded object-contain flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-surface-tertiary flex items-center justify-center flex-shrink-0">
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
          <div className="border-t border-border-default" />

          {/* Create new organization */}
          <button
            onClick={() => {
              setIsOpen(false)
              setIsCreateModalOpen(true)
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5
              hover:bg-surface-hover transition-colors text-left text-text-secondary"
          >
            <div className="w-8 h-8 rounded border border-dashed border-border-strong flex items-center justify-center">
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
