-- CreateEnum
CREATE TYPE "TypeStructure" AS ENUM ('PHARMACIE', 'LABORATOIRE', 'HOPITAL_PUBLIC', 'HOPITAL_PRIVE', 'CLINIQUE', 'CABINET_MEDICAL', 'CABINET_SPECIALISE', 'CENTRE_SANTE', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutJuridique" AS ENUM ('PRIVE', 'PUBLIC', 'CONFESSIONNEL');

-- CreateEnum
CREATE TYPE "NiveauAbonnement" AS ENUM ('BASIC', 'PREMIUM1', 'PREMIUM2');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('EN_ATTENTE', 'CONFIRME', 'ECHOUE', 'REMBOURSE');

-- CreateEnum
CREATE TYPE "TypePost" AS ENUM ('NOUVEAU_SERVICE', 'PROMOTION', 'DISPONIBILITE_MEDICAMENT', 'NOUVEL_EXAMEN', 'CAMPAGNE_DEPISTAGE', 'HORAIRES_MODIFIES', 'EVENEMENT_MEDICAL', 'RECRUTEMENT', 'MESSAGE_INSTITUTIONNEL', 'AUTRE');

-- CreateEnum
CREATE TYPE "RoleUtilisateur" AS ENUM ('PATIENT', 'STRUCTURE', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "RoleUtilisateur" NOT NULL DEFAULT 'PATIENT',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "structures" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nom_legal" TEXT NOT NULL,
    "nom_commercial" TEXT NOT NULL,
    "type_structure" "TypeStructure" NOT NULL,
    "telephone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT,
    "adresse" TEXT NOT NULL,
    "pays" TEXT NOT NULL DEFAULT 'Côte d''Ivoire',
    "ville" TEXT NOT NULL,
    "quartier" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "horaires" JSONB,
    "jours_feries" JSONB,
    "logo_url" TEXT,
    "photo_url" TEXT,
    "description" TEXT,
    "statut_juridique" "StatutJuridique",
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonnements" (
    "id" TEXT NOT NULL,
    "structure_id" TEXT NOT NULL,
    "niveau" "NiveauAbonnement" NOT NULL DEFAULT 'BASIC',
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3),
    "montant" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "devise" TEXT NOT NULL DEFAULT 'XOF',
    "statut_paiement" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "transaction_id" TEXT,
    "methode_paiement" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abonnements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicaments" (
    "id" TEXT NOT NULL,
    "nom_commercial" TEXT NOT NULL,
    "dci" TEXT NOT NULL,
    "classe_therapeutique" TEXT NOT NULL,
    "forme" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "laboratoire_fabricant" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacie_medicaments" (
    "id" TEXT NOT NULL,
    "pharmacie_id" TEXT NOT NULL,
    "medicament_id" TEXT NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT false,
    "en_stock" BOOLEAN NOT NULL DEFAULT false,
    "prix" DOUBLE PRECISION,
    "de_garde" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacie_medicaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "examens" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "code_azamed" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "examens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labo_examens" (
    "id" TEXT NOT NULL,
    "labo_id" TEXT NOT NULL,
    "examen_id" TEXT NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT false,
    "prix" DOUBLE PRECISION,
    "delai_min" INTEGER,
    "delai_max" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "labo_examens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services_medicaux" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "services_medicaux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hopital_services" (
    "id" TEXT NOT NULL,
    "hopital_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT false,
    "sur_rdv" BOOLEAN NOT NULL DEFAULT false,
    "horaires" JSONB,
    "prix_consultation" DOUBLE PRECISION,
    "prix_chambre" DOUBLE PRECISION,
    "info_supplementaire" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hopital_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "structure_id" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "type_post" "TypePost" NOT NULL DEFAULT 'AUTRE',
    "media_url" TEXT,
    "video_url" TEXT,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_approved" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "vues" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "structure_id" TEXT,
    "event_type" TEXT NOT NULL,
    "metadata" JSONB,
    "user_ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_recherches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "query" TEXT NOT NULL,
    "type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_recherches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "structures_user_id_key" ON "structures"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacie_medicaments_pharmacie_id_medicament_id_key" ON "pharmacie_medicaments"("pharmacie_id", "medicament_id");

-- CreateIndex
CREATE UNIQUE INDEX "examens_code_azamed_key" ON "examens"("code_azamed");

-- CreateIndex
CREATE UNIQUE INDEX "labo_examens_labo_id_examen_id_key" ON "labo_examens"("labo_id", "examen_id");

-- CreateIndex
CREATE UNIQUE INDEX "hopital_services_hopital_id_service_id_key" ON "hopital_services"("hopital_id", "service_id");

-- AddForeignKey
ALTER TABLE "structures" ADD CONSTRAINT "structures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_structure_id_fkey" FOREIGN KEY ("structure_id") REFERENCES "structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacie_medicaments" ADD CONSTRAINT "pharmacie_medicaments_pharmacie_id_fkey" FOREIGN KEY ("pharmacie_id") REFERENCES "structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacie_medicaments" ADD CONSTRAINT "pharmacie_medicaments_medicament_id_fkey" FOREIGN KEY ("medicament_id") REFERENCES "medicaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labo_examens" ADD CONSTRAINT "labo_examens_labo_id_fkey" FOREIGN KEY ("labo_id") REFERENCES "structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "labo_examens" ADD CONSTRAINT "labo_examens_examen_id_fkey" FOREIGN KEY ("examen_id") REFERENCES "examens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hopital_services" ADD CONSTRAINT "hopital_services_hopital_id_fkey" FOREIGN KEY ("hopital_id") REFERENCES "structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hopital_services" ADD CONSTRAINT "hopital_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services_medicaux"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_structure_id_fkey" FOREIGN KEY ("structure_id") REFERENCES "structures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_structure_id_fkey" FOREIGN KEY ("structure_id") REFERENCES "structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_recherches" ADD CONSTRAINT "historique_recherches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
