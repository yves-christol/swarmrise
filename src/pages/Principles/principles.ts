import { useTranslation } from "react-i18next";

export const usePrinciples = () => {
  const { t } = useTranslation("legal");

  return [
    {
      title: t("principles.items.noFunnyHats.title"),
      content: t("principles.items.noFunnyHats.content"),
    },
    {
      title: t("principles.items.youComeFirst.title"),
      content: t("principles.items.youComeFirst.content"),
    },
    {
      title: t("principles.items.alwaysTellWhy.title"),
      content: t("principles.items.alwaysTellWhy.content"),
    },
    {
      title: t("principles.items.doersAreKings.title"),
      content: t("principles.items.doersAreKings.content"),
    },
    {
      title: t("principles.items.ethicalBehaviors.title"),
      content: t("principles.items.ethicalBehaviors.content"),
    },
    {
      title: t("principles.items.frictionless.title"),
      content: t("principles.items.frictionless.content"),
    },
    {
      title: t("principles.items.sharingIsGood.title"),
      content: t("principles.items.sharingIsGood.content"),
    },
    {
      title: t("principles.items.lowComplexity.title"),
      content: t("principles.items.lowComplexity.content"),
    },
    {
      title: t("principles.items.workInProgress.title"),
      content: t("principles.items.workInProgress.content"),
    },
  ];
};
