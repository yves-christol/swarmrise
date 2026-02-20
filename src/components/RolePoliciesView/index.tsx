import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import type { Policy } from "../../../convex/policies";
import { useSelectedOrga } from "../../tools/orgaStore";
import { PolicyMarkdown } from "../shared/PolicyMarkdown";
import { PolicyForm } from "./PolicyForm";

type RolePoliciesViewProps = {
  roleId: Id<"roles">;
};

type Mode =
  | { type: "list" }
  | { type: "create" }
  | { type: "edit"; policy: Policy }
  | { type: "detail"; policy: Policy };

export function RolePoliciesView({ roleId }: RolePoliciesViewProps) {
  const { t } = useTranslation("policies");
  const { t: tCommon } = useTranslation("common");

  const [mode, setMode] = useState<Mode>({ type: "list" });

  const role = useQuery(api.roles.functions.getRoleById, { roleId });
  const policies = useQuery(api.policies.functions.listByRole, { roleId });
  const { myMember } = useSelectedOrga();

  const isHolder = !!(role && myMember && role.memberId === myMember._id);

  const handleBackToList = useCallback(() => setMode({ type: "list" }), []);

  if (role === undefined || policies === undefined) {
    return (
      <div className="absolute inset-0 bg-light dark:bg-dark flex items-center justify-center">
        <div className="text-text-secondary">{tCommon("loading")}</div>
      </div>
    );
  }

  if (role === null) {
    return (
      <div className="absolute inset-0 bg-light dark:bg-dark flex items-center justify-center">
        <div className="text-text-secondary">{tCommon("noResults")}</div>
      </div>
    );
  }

  // Create form
  if (mode.type === "create") {
    return (
      <div className="absolute inset-0 bg-light dark:bg-dark overflow-auto">
        <div className="pt-8 px-8 pb-8 max-w-2xl mx-auto">
          <PolicyForm
            orgaId={role.orgaId}
            roleId={roleId}
            onSaved={handleBackToList}
            onCancel={handleBackToList}
          />
        </div>
      </div>
    );
  }

  // Edit form
  if (mode.type === "edit") {
    return (
      <div className="absolute inset-0 bg-light dark:bg-dark overflow-auto">
        <div className="pt-8 px-8 pb-8 max-w-2xl mx-auto">
          <PolicyForm
            orgaId={role.orgaId}
            roleId={roleId}
            initialData={{
              policyId: mode.policy._id,
              title: mode.policy.title,
              abstract: mode.policy.abstract,
              text: mode.policy.text,
            }}
            onSaved={handleBackToList}
            onCancel={handleBackToList}
          />
        </div>
      </div>
    );
  }

  // Detail view
  if (mode.type === "detail") {
    return (
      <RolePolicyDetail
        policy={mode.policy}
        isHolder={isHolder}
        onBack={handleBackToList}
        onEdit={() => setMode({ type: "edit", policy: mode.policy })}
      />
    );
  }

  // List view
  return (
    <div className="absolute inset-0 bg-light dark:bg-dark overflow-auto">
      <div className="pt-8 px-8 pb-8 max-w-2xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-dark dark:text-light">
              {t("list.title")}
            </h1>
            {isHolder && (
              <button
                onClick={() => setMode({ type: "create" })}
                className="
                  flex items-center gap-1.5
                  px-3 py-1.5 text-sm font-medium
                  bg-highlight hover:bg-highlight-hover
                  text-dark
                  rounded-lg
                  transition-colors duration-75
                "
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M7 1v12M1 7h12" />
                </svg>
                {t("role.newPolicy")}
              </button>
            )}
          </div>
          <p className="text-sm text-text-secondary mt-1">
            {role.title}
          </p>
        </header>

        {policies.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            {t("role.noPolicies")}
          </div>
        ) : (
          <div className="bg-surface-primary border border-border-default rounded-lg overflow-hidden divide-y divide-border-default">
            {policies.map((policy) => (
              <div
                key={policy._id}
                className="flex items-center group"
              >
                <button
                  onClick={() => setMode({ type: "detail", policy })}
                  className="
                    flex-1 px-4 py-3 text-left
                    hover:bg-surface-hover-subtle
                    transition-colors duration-75
                    focus:outline-none focus:ring-2 focus:ring-inset focus:ring-highlight
                    flex items-center gap-3
                    min-w-0
                  "
                >
                  <span className="shrink-0 text-xs font-mono text-text-tertiary bg-surface-tertiary rounded px-1.5 py-0.5">
                    #{policy.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-dark dark:text-light truncate">
                      {policy.title}
                    </div>
                    <div className="text-sm text-text-description line-clamp-1 mt-0.5">
                      {policy.abstract}
                    </div>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="shrink-0 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-hidden="true"
                  >
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </button>
                {isHolder && (
                  <button
                    onClick={() => setMode({ type: "edit", policy })}
                    className="
                      shrink-0 p-3
                      text-text-tertiary
                      hover:text-highlight
                      transition-colors duration-75
                      opacity-0 group-hover:opacity-100
                      focus:outline-none focus:ring-2 focus:ring-highlight focus:opacity-100
                    "
                    aria-label={t("detail.edit")}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M8.5 2.5l3 3M1.5 9.5l6-6 3 3-6 6H1.5v-3z" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Detail sub-component ---

function RolePolicyDetail({
  policy,
  isHolder,
  onBack,
  onEdit,
}: {
  policy: Policy;
  isHolder: boolean;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation("policies");
  const { t: tCommon } = useTranslation("common");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  const removePolicy = useMutation(api.policies.functions.remove);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await removePolicy({ policyId: policy._id });
      onBack();
    } catch (error) {
      setDeleteMessage(
        error instanceof Error ? error.message : t("detail.deleteFailed")
      );
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-light dark:bg-dark overflow-auto">
      <div className="pt-8 px-8 pb-8 max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={onBack}
          className="
            flex items-center gap-1.5
            text-sm text-text-secondary
            hover:text-dark dark:hover:text-light
            transition-colors duration-75
            mb-6
          "
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M10 4l-4 4 4 4" />
          </svg>
          {t("detail.backToList")}
        </button>

        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs font-mono text-text-tertiary bg-surface-tertiary rounded px-2 py-1">
              #{policy.number}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-dark dark:text-light mb-2">
            {policy.title}
          </h1>
        </header>

        {/* Delete error */}
        {deleteMessage && (
          <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            {deleteMessage}
          </div>
        )}

        {/* Abstract */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">
            {t("detail.abstract")}
          </h2>
          <div className="bg-surface-primary border border-border-default rounded-lg p-4">
            <p className="text-text-description leading-relaxed">{policy.abstract}</p>
          </div>
        </section>

        {/* Full text */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2">
            {t("detail.fullText")}
          </h2>
          <div className="bg-surface-primary border border-border-default rounded-lg p-6">
            <PolicyMarkdown text={policy.text} />
          </div>
        </section>

        {/* Actions for holder */}
        {isHolder && (
          <section className="pt-6 border-t border-border-default">
            <div className="flex items-center gap-3">
              <button
                onClick={onEdit}
                className="
                  px-4 py-2 text-sm font-medium
                  border border-highlight-hover dark:border-highlight
                  text-highlight-hover dark:text-highlight
                  hover:bg-highlight/10
                  rounded-lg
                  transition-colors duration-75
                "
              >
                {t("detail.edit")}
              </button>

              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void handleDelete()}
                    disabled={isDeleting}
                    className="
                      px-4 py-2 text-sm font-medium
                      bg-red-600 hover:bg-red-700
                      text-white
                      rounded-lg
                      transition-colors
                      disabled:opacity-50
                    "
                  >
                    {isDeleting ? "..." : t("detail.confirmDelete")}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="
                      px-4 py-2 text-sm
                      text-text-description
                      hover:text-dark dark:hover:text-light
                      transition-colors
                    "
                  >
                    {tCommon("cancel")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="
                    px-4 py-2 text-sm
                    border border-red-600 dark:border-red-400
                    text-red-600 dark:text-red-400
                    hover:bg-red-50 dark:hover:bg-red-900/20
                    rounded-lg
                    transition-colors
                  "
                >
                  {t("detail.delete")}
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
