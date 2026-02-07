import { PromptConfig } from "./types";

import agencyLanding from "../../prompts/agency-landing.json";
import analyticsDashboard from "../../prompts/analytics-dashboard.json";
import chatInterface from "../../prompts/chat-interface.json";
import checkoutFlow from "../../prompts/checkout-flow.json";
import dataTable from "../../prompts/data-table.json";
import monitoringDashboard from "../../prompts/monitoring-dashboard.json";
import navigationSidebar from "../../prompts/navigation-sidebar.json";
import portfolioSite from "../../prompts/portfolio-site.json";
import saasLanding from "../../prompts/saas-landing.json";
import settingsPage from "../../prompts/settings-page.json";
import signupForm from "../../prompts/signup-form.json";
import todoApp from "../../prompts/todo-app.json";

export const PROMPT_BANK: PromptConfig[] = [
  agencyLanding,
  analyticsDashboard,
  chatInterface,
  checkoutFlow,
  dataTable,
  monitoringDashboard,
  navigationSidebar,
  portfolioSite,
  saasLanding,
  settingsPage,
  signupForm,
  todoApp,
];

export function getPromptById(id: string): PromptConfig | undefined {
  return PROMPT_BANK.find((p) => p.id === id);
}
