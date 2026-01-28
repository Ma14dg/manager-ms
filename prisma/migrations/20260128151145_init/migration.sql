-- CreateTable
CREATE TABLE "TicketRelation" (
    "id" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sourceIssueId" TEXT NOT NULL,
    "sourceIssueKey" TEXT NOT NULL,
    "targetSystem" TEXT NOT NULL,
    "targetIssueId" TEXT NOT NULL,
    "targetIssueKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketRelation_sourceSystem_sourceIssueId_idx" ON "TicketRelation"("sourceSystem", "sourceIssueId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketRelation_sourceSystem_sourceIssueId_targetSystem_targ_key" ON "TicketRelation"("sourceSystem", "sourceIssueId", "targetSystem", "targetIssueId");
