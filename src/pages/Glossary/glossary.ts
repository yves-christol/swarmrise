import { useTranslation } from "react-i18next";

export type GlossaryEntry = {
  title: string;
  description: string;
  example?: string;
};

export const useGlossary = (): GlossaryEntry[] => {
  const { t } = useTranslation("glossary");

  return [
    {
      title: t("items.swarmrise.title"),
      description: t("items.swarmrise.description"),
      example: t("items.swarmrise.example", { defaultValue: "" }),
    },
    {
      title: t("items.user.title"),
      description: t("items.user.description"),
      example: t("items.user.example", { defaultValue: "" }),
    },
    {
      title: t("items.orga.title"),
      description: t("items.orga.description"),
      example: t("items.orga.example", { defaultValue: "" }),
    },
    {
      title: t("items.member.title"),
      description: t("items.member.description"),
      example: t("items.member.example", { defaultValue: "" }),
    },
    {
      title: t("items.team.title"),
      description: t("items.team.description"),
      example: t("items.team.example", { defaultValue: "" }),
    },
    {
      title: t("items.role.title"),
      description: t("items.role.description"),
      example: t("items.role.example", { defaultValue: "" }),
    },
    {
      title: t("items.decision.title"),
      description: t("items.decision.description"),
      example: t("items.decision.example", { defaultValue: "" }),
    },
    {
      title: t("items.mission.title"),
      description: t("items.mission.description"),
      example: t("items.mission.example", { defaultValue: "" }),
    },
    {
      title: t("items.duty.title"),
      description: t("items.duty.description"),
      example: t("items.duty.example", { defaultValue: "" }),
    },
  ];
};
