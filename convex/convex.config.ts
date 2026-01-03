// convex/convex.config.ts
import { defineApp } from "convex/server";
import aggregate from "@convex-dev/aggregate/convex.config.js";

const app = defineApp();
app.use(aggregate, { name: "aggregateMembers" });
app.use(aggregate, { name: "aggregateTeams" });
app.use(aggregate, { name: "aggregateRoles" });
export default app;

