import { useTranslation } from "react-i18next";

export type GovernanceModelSection = {
  type: "governanceModel";
  title: string;
  subtitle: string;
  intro: string;
  multiRole: { title: string; content: string };
};

export type RoleTriadSection = {
  type: "roleTriad";
  title: string;
  subtitle: string;
  intro: string;
  roles: { title: string; content: string }[];
  footer: string;
};

export type ConsentDecisionsSection = {
  type: "consentDecisions";
  title: string;
  subtitle: string;
  intro: string;
  steps: { title: string; content: string }[];
  footer: string;
};

export type TeamConnectionsSection = {
  type: "teamConnections";
  title: string;
  subtitle: string;
  content: string;
};

export type CommunicationSection = {
  type: "communication";
  title: string;
  subtitle: string;
  intro: string;
  items: string[];
};

export type TopicsPoliciesTemplatesSection = {
  type: "topicsPoliciesTemplates";
  title: string;
  subtitle: string;
  items: { title: string; content: string }[];
};

export type WhatItIsNotSection = {
  type: "whatItIsNot";
  title: string;
  subtitle: string;
  items: { title: string; content: string }[];
};

export type Section =
  | GovernanceModelSection
  | RoleTriadSection
  | ConsentDecisionsSection
  | TeamConnectionsSection
  | CommunicationSection
  | TopicsPoliciesTemplatesSection
  | WhatItIsNotSection;

export const useSections = (): Section[] => {
  const { t } = useTranslation("legal");

  return [
    {
      type: "governanceModel",
      title: t("principles.sections.governanceModel.title"),
      subtitle: t("principles.sections.governanceModel.subtitle"),
      intro: t("principles.sections.governanceModel.intro"),
      multiRole: {
        title: t("principles.sections.governanceModel.multiRole.title"),
        content: t("principles.sections.governanceModel.multiRole.content"),
      },
    },
    {
      type: "roleTriad",
      title: t("principles.sections.roleTriad.title"),
      subtitle: t("principles.sections.roleTriad.subtitle"),
      intro: t("principles.sections.roleTriad.intro"),
      roles: [
        {
          title: t("principles.sections.roleTriad.leader.title"),
          content: t("principles.sections.roleTriad.leader.content"),
        },
        {
          title: t("principles.sections.roleTriad.secretary.title"),
          content: t("principles.sections.roleTriad.secretary.content"),
        },
        {
          title: t("principles.sections.roleTriad.referee.title"),
          content: t("principles.sections.roleTriad.referee.content"),
        },
      ],
      footer: t("principles.sections.roleTriad.footer"),
    },
    {
      type: "consentDecisions",
      title: t("principles.sections.consentDecisions.title"),
      subtitle: t("principles.sections.consentDecisions.subtitle"),
      intro: t("principles.sections.consentDecisions.intro"),
      steps: [
        {
          title: t("principles.sections.consentDecisions.proposition.title"),
          content: t("principles.sections.consentDecisions.proposition.content"),
        },
        {
          title: t("principles.sections.consentDecisions.clarification.title"),
          content: t("principles.sections.consentDecisions.clarification.content"),
        },
        {
          title: t("principles.sections.consentDecisions.consent.title"),
          content: t("principles.sections.consentDecisions.consent.content"),
        },
      ],
      footer: t("principles.sections.consentDecisions.footer"),
    },
    {
      type: "teamConnections",
      title: t("principles.sections.teamConnections.title"),
      subtitle: t("principles.sections.teamConnections.subtitle"),
      content: t("principles.sections.teamConnections.content"),
    },
    {
      type: "communication",
      title: t("principles.sections.communication.title"),
      subtitle: t("principles.sections.communication.subtitle"),
      intro: t("principles.sections.communication.intro"),
      items: [
        t("principles.sections.communication.items.teamContext"),
        t("principles.sections.communication.items.firstClass"),
        t("principles.sections.communication.items.policyFlow"),
        t("principles.sections.communication.items.threaded"),
      ],
    },
    {
      type: "topicsPoliciesTemplates",
      title: t("principles.sections.topicsPoliciesTemplates.title"),
      subtitle: t("principles.sections.topicsPoliciesTemplates.subtitle"),
      items: [
        {
          title: t("principles.sections.topicsPoliciesTemplates.topics.title"),
          content: t("principles.sections.topicsPoliciesTemplates.topics.content"),
        },
        {
          title: t("principles.sections.topicsPoliciesTemplates.policies.title"),
          content: t("principles.sections.topicsPoliciesTemplates.policies.content"),
        },
        {
          title: t("principles.sections.topicsPoliciesTemplates.templates.title"),
          content: t("principles.sections.topicsPoliciesTemplates.templates.content"),
        },
      ],
    },
    {
      type: "whatItIsNot",
      title: t("principles.sections.whatItIsNot.title"),
      subtitle: t("principles.sections.whatItIsNot.subtitle"),
      items: [
        {
          title: t("principles.sections.whatItIsNot.notProjectManagement.title"),
          content: t("principles.sections.whatItIsNot.notProjectManagement.content"),
        },
        {
          title: t("principles.sections.whatItIsNot.notHierarchyEnabler.title"),
          content: t("principles.sections.whatItIsNot.notHierarchyEnabler.content"),
        },
        {
          title: t("principles.sections.whatItIsNot.notReligion.title"),
          content: t("principles.sections.whatItIsNot.notReligion.content"),
        },
        {
          title: t("principles.sections.whatItIsNot.notFinished.title"),
          content: t("principles.sections.whatItIsNot.notFinished.content"),
        },
      ],
    },
  ];
};
