-- CreateIndex
CREATE INDEX "tasks_project_id_status_created_at_idx" ON "tasks"("project_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "tasks_project_id_sprint_id_status_idx" ON "tasks"("project_id", "sprint_id", "status");

-- CreateIndex
CREATE INDEX "tasks_project_id_due_date_idx" ON "tasks"("project_id", "due_date");
