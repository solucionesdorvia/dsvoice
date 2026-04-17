-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Substance" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "formula" TEXT,
    "casNumber" TEXT,
    "unNumber" TEXT,
    "ecNumber" TEXT,
    "hazardIdNumber" TEXT,
    "pubchemCid" INTEGER,
    "ppeCategories" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Substance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubstanceGHS" (
    "id" SERIAL NOT NULL,
    "substanceId" INTEGER NOT NULL,
    "pictogramCode" TEXT NOT NULL,

    CONSTRAINT "SubstanceGHS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExposureLimit" (
    "id" SERIAL NOT NULL,
    "substanceId" INTEGER NOT NULL,
    "countryCode" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "limitType" TEXT NOT NULL,
    "valuePpm" DOUBLE PRECISION,
    "valueMgM3" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "ExposureLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HStatement" (
    "code" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "textEs" TEXT,

    CONSTRAINT "HStatement_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "SubstanceHStatement" (
    "substanceId" INTEGER NOT NULL,
    "hCode" TEXT NOT NULL,

    CONSTRAINT "SubstanceHStatement_pkey" PRIMARY KEY ("substanceId","hCode")
);

-- CreateTable
CREATE TABLE "PStatement" (
    "code" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "textEs" TEXT,

    CONSTRAINT "PStatement_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "SubstancePStatement" (
    "substanceId" INTEGER NOT NULL,
    "pCode" TEXT NOT NULL,

    CONSTRAINT "SubstancePStatement_pkey" PRIMARY KEY ("substanceId","pCode")
);

-- CreateTable
CREATE TABLE "PhysicalProperties" (
    "substanceId" INTEGER NOT NULL,
    "decompositionTempC" DOUBLE PRECISION,
    "meltingPointC" DOUBLE PRECISION,
    "boilingPointC" DOUBLE PRECISION,
    "densityGCm3" DOUBLE PRECISION,
    "ionizationEv" DOUBLE PRECISION,
    "flashPointC" DOUBLE PRECISION,
    "ignitionTempC" DOUBLE PRECISION,
    "lelVolPct" DOUBLE PRECISION,
    "uelVolPct" DOUBLE PRECISION,
    "hazardousEffects" TEXT,

    CONSTRAINT "PhysicalProperties_pkey" PRIMARY KEY ("substanceId")
);

-- CreateTable
CREATE TABLE "SubstanceSynonym" (
    "id" SERIAL NOT NULL,
    "substanceId" INTEGER NOT NULL,
    "synonym" TEXT NOT NULL,

    CONSTRAINT "SubstanceSynonym_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Substance_casNumber_key" ON "Substance"("casNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Substance_pubchemCid_key" ON "Substance"("pubchemCid");

-- CreateIndex
CREATE INDEX "Substance_name_idx" ON "Substance"("name");

-- CreateIndex
CREATE INDEX "Substance_casNumber_idx" ON "Substance"("casNumber");

-- CreateIndex
CREATE INDEX "Substance_formula_idx" ON "Substance"("formula");

-- CreateIndex
CREATE UNIQUE INDEX "SubstanceGHS_substanceId_pictogramCode_key" ON "SubstanceGHS"("substanceId", "pictogramCode");

-- CreateIndex
CREATE INDEX "ExposureLimit_substanceId_idx" ON "ExposureLimit"("substanceId");

-- CreateIndex
CREATE INDEX "SubstanceSynonym_synonym_idx" ON "SubstanceSynonym"("synonym");

-- CreateIndex
CREATE INDEX "SubstanceSynonym_substanceId_idx" ON "SubstanceSynonym"("substanceId");

-- AddForeignKey
ALTER TABLE "SubstanceGHS" ADD CONSTRAINT "SubstanceGHS_substanceId_fkey" FOREIGN KEY ("substanceId") REFERENCES "Substance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExposureLimit" ADD CONSTRAINT "ExposureLimit_substanceId_fkey" FOREIGN KEY ("substanceId") REFERENCES "Substance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstanceHStatement" ADD CONSTRAINT "SubstanceHStatement_substanceId_fkey" FOREIGN KEY ("substanceId") REFERENCES "Substance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstanceHStatement" ADD CONSTRAINT "SubstanceHStatement_hCode_fkey" FOREIGN KEY ("hCode") REFERENCES "HStatement"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstancePStatement" ADD CONSTRAINT "SubstancePStatement_substanceId_fkey" FOREIGN KEY ("substanceId") REFERENCES "Substance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstancePStatement" ADD CONSTRAINT "SubstancePStatement_pCode_fkey" FOREIGN KEY ("pCode") REFERENCES "PStatement"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalProperties" ADD CONSTRAINT "PhysicalProperties_substanceId_fkey" FOREIGN KEY ("substanceId") REFERENCES "Substance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstanceSynonym" ADD CONSTRAINT "SubstanceSynonym_substanceId_fkey" FOREIGN KEY ("substanceId") REFERENCES "Substance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

