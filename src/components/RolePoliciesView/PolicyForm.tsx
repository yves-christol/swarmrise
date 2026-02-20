import { useState } from "react";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { PolicyMarkdown } from "../shared/PolicyMarkdown";

type PolicyFormProps = {
  orgaId: Id<"orgas">;
  roleId: Id<"roles">;
  initialData?: {
    policyId: Id<"policies">;
    title: string;
    abstract: string;
    text: string;
  };
  onSaved: () => void;
  onCancel: () => void;
};

export function PolicyForm({ orgaId, roleId, initialData, onSaved, onCancel }: PolicyFormProps) {
  const { t } = useTranslation("policies");
  const isEdit = !!initialData;

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [abstract, setAbstract] = useState(initialData?.abstract ?? "");
  const [text, setText] = useState(initialData?.text ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [errors, setErrors] = useState<{ title?: string; abstract?: string }>({});

  const createPolicy = useMutation(api.policies.functions.create);
  const updatePolicy = useMutation(api.policies.functions.update);

  const validate = (): boolean => {
    const newErrors: { title?: string; abstract?: string } = {};
    if (!title.trim()) newErrors.title = t("form.titleRequired");
    if (!abstract.trim()) newErrors.abstract = t("form.abstractRequired");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSaving(true);
    setMessage(null);
    try {
      if (isEdit && initialData) {
        await updatePolicy({
          policyId: initialData.policyId,
          title: title.trim(),
          abstract: abstract.trim(),
          text: text.trim(),
        });
        setMessage({ type: "success", text: t("form.updated") });
      } else {
        await createPolicy({
          orgaId,
          roleId,
          title: title.trim(),
          abstract: abstract.trim(),
          text: text.trim(),
        });
        setMessage({ type: "success", text: t("form.created") });
      }
      setTimeout(onSaved, 500);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : t("form.saveFailed"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-dark dark:text-light mb-6">
        {isEdit ? t("form.editTitle") : t("form.createTitle")}
      </h2>

      {/* Message banner */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Title */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-description mb-1.5">
          {t("form.titleLabel")}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          placeholder={t("form.titlePlaceholder")}
          className={`
            w-full px-3 py-2
            border ${errors.title ? "border-red-400" : "border-border-strong"}
            rounded-lg
            bg-surface-primary
            text-dark dark:text-light
            focus:outline-none focus:ring-2 focus:ring-highlight
          `}
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-500">{errors.title}</p>
        )}
      </div>

      {/* Abstract */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-description mb-1.5">
          {t("form.abstractLabel")}
        </label>
        <textarea
          value={abstract}
          onChange={(e) => {
            setAbstract(e.target.value);
            if (errors.abstract) setErrors((prev) => ({ ...prev, abstract: undefined }));
          }}
          placeholder={t("form.abstractPlaceholder")}
          rows={3}
          className={`
            w-full px-3 py-2
            border ${errors.abstract ? "border-red-400" : "border-border-strong"}
            rounded-lg
            bg-surface-primary
            text-dark dark:text-light
            focus:outline-none focus:ring-2 focus:ring-highlight
            resize-none
          `}
        />
        {errors.abstract && (
          <p className="mt-1 text-xs text-red-500">{errors.abstract}</p>
        )}
      </div>

      {/* Text (Write/Preview toggle) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-text-description">
            {t("form.textLabel")}
          </label>
          <div className="flex rounded-md border border-border-default overflow-hidden">
            <button
              type="button"
              onClick={() => setTab("write")}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                tab === "write"
                  ? "bg-highlight/20 text-highlight-hover dark:text-highlight"
                  : "text-text-secondary hover:text-text-description"
              }`}
            >
              {t("form.write")}
            </button>
            <button
              type="button"
              onClick={() => setTab("preview")}
              className={`px-3 py-1 text-xs font-medium transition-colors border-l border-border-default ${
                tab === "preview"
                  ? "bg-highlight/20 text-highlight-hover dark:text-highlight"
                  : "text-text-secondary hover:text-text-description"
              }`}
            >
              {t("form.preview")}
            </button>
          </div>
        </div>
        {tab === "write" ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("form.textPlaceholder")}
            rows={16}
            className="
              w-full px-3 py-2
              border border-border-strong
              rounded-lg
              bg-surface-primary
              text-dark dark:text-light
              font-mono text-sm
              focus:outline-none focus:ring-2 focus:ring-highlight
              resize-y
            "
          />
        ) : (
          <div className="border border-border-strong rounded-lg bg-surface-primary p-4 min-h-[24rem]">
            {text.trim() ? (
              <PolicyMarkdown text={text} />
            ) : (
              <p className="text-text-tertiary italic text-sm">
                {t("form.textPlaceholder")}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="
            px-4 py-2 text-sm
            text-text-description
            hover:text-dark dark:hover:text-light
            transition-colors
          "
        >
          {t("form.cancel")}
        </button>
        <button
          onClick={() => void handleSubmit()}
          disabled={isSaving}
          className="
            px-4 py-2 text-sm font-medium
            bg-highlight hover:bg-highlight-hover
            text-dark
            rounded-lg
            transition-colors duration-75
            disabled:opacity-50
          "
        >
          {isSaving ? t("form.saving") : t("form.save")}
        </button>
      </div>
    </div>
  );
}
