CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Availability" ADD CONSTRAINT "availability_positive_duration" CHECK ("endsAt" > "startsAt");
ALTER TABLE "Appointment" ADD CONSTRAINT "appointment_positive_duration" CHECK ("endsAt" > "startsAt");
ALTER TABLE "PsychologistProfile" ADD CONSTRAINT "professional_price_positive" CHECK ("price" >= 100);
ALTER TABLE "Appointment" ADD CONSTRAINT "no_psychologist_overlap" EXCLUDE USING gist
  ("psychologistId" WITH =, tsrange("startsAt", "endsAt", '[)') WITH &&)
  WHERE ("status" IN ('REQUESTED', 'CONFIRMED'));
ALTER TABLE "Appointment" ADD CONSTRAINT "no_patient_overlap" EXCLUDE USING gist
  ("patientId" WITH =, tsrange("startsAt", "endsAt", '[)') WITH &&)
  WHERE ("status" IN ('REQUESTED', 'CONFIRMED'));
ALTER TABLE "Availability" ADD CONSTRAINT "no_availability_overlap" EXCLUDE USING gist
  ("psychologistId" WITH =, tsrange("startsAt", "endsAt", '[)') WITH &&);
CREATE UNIQUE INDEX "one_pending_verification" ON "ProfessionalVerification" ("psychologistId") WHERE "status" = 'PENDING';
