export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      Appointment: {
        Row: {
          availabilityId: string
          createdAt: string
          endsAt: string
          id: string
          matchId: string
          patientConfirmedAt: string | null
          patientId: string
          psychologistId: string
          startsAt: string
          status: Database["public"]["Enums"]["AppointmentStatus"]
          updatedAt: string
        }
        Insert: {
          availabilityId: string
          createdAt?: string
          endsAt: string
          id: string
          matchId: string
          patientConfirmedAt?: string | null
          patientId: string
          psychologistId: string
          startsAt: string
          status?: Database["public"]["Enums"]["AppointmentStatus"]
          updatedAt: string
        }
        Update: {
          availabilityId?: string
          createdAt?: string
          endsAt?: string
          id?: string
          matchId?: string
          patientConfirmedAt?: string | null
          patientId?: string
          psychologistId?: string
          startsAt?: string
          status?: Database["public"]["Enums"]["AppointmentStatus"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Appointment_availabilityId_fkey"
            columns: ["availabilityId"]
            isOneToOne: false
            referencedRelation: "Availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Appointment_matchId_fkey"
            columns: ["matchId"]
            isOneToOne: false
            referencedRelation: "Match"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Appointment_patientId_fkey"
            columns: ["patientId"]
            isOneToOne: false
            referencedRelation: "PatientProfile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Appointment_psychologistId_fkey"
            columns: ["psychologistId"]
            isOneToOne: false
            referencedRelation: "PsychologistProfile"
            referencedColumns: ["id"]
          },
        ]
      }
      Availability: {
        Row: {
          createdAt: string
          endsAt: string
          id: string
          psychologistId: string
          startsAt: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          endsAt: string
          id: string
          psychologistId: string
          startsAt: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          endsAt?: string
          id?: string
          psychologistId?: string
          startsAt?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Availability_psychologistId_fkey"
            columns: ["psychologistId"]
            isOneToOne: false
            referencedRelation: "PsychologistProfile"
            referencedColumns: ["id"]
          },
        ]
      }
      Block: {
        Row: {
          blockedId: string
          blockerId: string
          createdAt: string
          id: string
          updatedAt: string
        }
        Insert: {
          blockedId: string
          blockerId: string
          createdAt?: string
          id: string
          updatedAt: string
        }
        Update: {
          blockedId?: string
          blockerId?: string
          createdAt?: string
          id?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Block_blockedId_fkey"
            columns: ["blockedId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Block_blockerId_fkey"
            columns: ["blockerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Conversation: {
        Row: {
          createdAt: string
          id: string
          matchId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id: string
          matchId: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          id?: string
          matchId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Conversation_matchId_fkey"
            columns: ["matchId"]
            isOneToOne: false
            referencedRelation: "Match"
            referencedColumns: ["id"]
          },
        ]
      }
      Favorite: {
        Row: {
          createdAt: string
          id: string
          patientId: string
          psychologistId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id: string
          patientId: string
          psychologistId: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          id?: string
          patientId?: string
          psychologistId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Favorite_patientId_fkey"
            columns: ["patientId"]
            isOneToOne: false
            referencedRelation: "PatientProfile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Favorite_psychologistId_fkey"
            columns: ["psychologistId"]
            isOneToOne: false
            referencedRelation: "PsychologistProfile"
            referencedColumns: ["id"]
          },
        ]
      }
      Interest: {
        Row: {
          createdAt: string
          id: string
          patientId: string
          psychologistId: string
          status: Database["public"]["Enums"]["InterestStatus"]
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id: string
          patientId: string
          psychologistId: string
          status?: Database["public"]["Enums"]["InterestStatus"]
          updatedAt: string
        }
        Update: {
          createdAt?: string
          id?: string
          patientId?: string
          psychologistId?: string
          status?: Database["public"]["Enums"]["InterestStatus"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Interest_patientId_fkey"
            columns: ["patientId"]
            isOneToOne: false
            referencedRelation: "PatientProfile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Interest_psychologistId_fkey"
            columns: ["psychologistId"]
            isOneToOne: false
            referencedRelation: "PsychologistProfile"
            referencedColumns: ["id"]
          },
        ]
      }
      Match: {
        Row: {
          active: boolean
          createdAt: string
          id: string
          patientId: string
          psychologistId: string
          updatedAt: string
        }
        Insert: {
          active?: boolean
          createdAt?: string
          id: string
          patientId: string
          psychologistId: string
          updatedAt: string
        }
        Update: {
          active?: boolean
          createdAt?: string
          id?: string
          patientId?: string
          psychologistId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Match_patientId_fkey"
            columns: ["patientId"]
            isOneToOne: false
            referencedRelation: "PatientProfile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Match_psychologistId_fkey"
            columns: ["psychologistId"]
            isOneToOne: false
            referencedRelation: "PsychologistProfile"
            referencedColumns: ["id"]
          },
        ]
      }
      Message: {
        Row: {
          body: string
          conversationId: string
          createdAt: string
          id: string
          readAt: string | null
          senderId: string
          updatedAt: string
        }
        Insert: {
          body: string
          conversationId: string
          createdAt?: string
          id: string
          readAt?: string | null
          senderId: string
          updatedAt: string
        }
        Update: {
          body?: string
          conversationId?: string
          createdAt?: string
          id?: string
          readAt?: string | null
          senderId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Message_conversationId_fkey"
            columns: ["conversationId"]
            isOneToOne: false
            referencedRelation: "Conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Message_senderId_fkey"
            columns: ["senderId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      PassedProfile: {
        Row: {
          createdAt: string
          patientId: string
          psychologistId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          patientId: string
          psychologistId: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          patientId?: string
          psychologistId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "PassedProfile_patientId_fkey"
            columns: ["patientId"]
            isOneToOne: false
            referencedRelation: "PatientProfile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PassedProfile_psychologistId_fkey"
            columns: ["psychologistId"]
            isOneToOne: false
            referencedRelation: "PsychologistProfile"
            referencedColumns: ["id"]
          },
        ]
      }
      PasswordReset: {
        Row: {
          createdAt: string
          expiresAt: string
          id: string
          tokenHash: string
          updatedAt: string
          usedAt: string | null
          userId: string
        }
        Insert: {
          createdAt?: string
          expiresAt: string
          id: string
          tokenHash: string
          updatedAt: string
          usedAt?: string | null
          userId: string
        }
        Update: {
          createdAt?: string
          expiresAt?: string
          id?: string
          tokenHash?: string
          updatedAt?: string
          usedAt?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "PasswordReset_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      PatientPreference: {
        Row: {
          approaches: string[] | null
          availability: string
          budget: number
          city: string
          communication: string
          createdAt: string
          expectations: string[] | null
          frequency: string
          gender: string
          goals: string[] | null
          id: string
          language: string
          minExperience: number
          modality: string
          patientId: string
          strictBudget: boolean
          strictModality: boolean
          styles: Json
          updatedAt: string
        }
        Insert: {
          approaches?: string[] | null
          availability?: string
          budget?: number
          city?: string
          communication?: string
          createdAt?: string
          expectations?: string[] | null
          frequency?: string
          gender?: string
          goals?: string[] | null
          id: string
          language?: string
          minExperience?: number
          modality?: string
          patientId: string
          strictBudget?: boolean
          strictModality?: boolean
          styles: Json
          updatedAt: string
        }
        Update: {
          approaches?: string[] | null
          availability?: string
          budget?: number
          city?: string
          communication?: string
          createdAt?: string
          expectations?: string[] | null
          frequency?: string
          gender?: string
          goals?: string[] | null
          id?: string
          language?: string
          minExperience?: number
          modality?: string
          patientId?: string
          strictBudget?: boolean
          strictModality?: boolean
          styles?: Json
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "PatientPreference_patientId_fkey"
            columns: ["patientId"]
            isOneToOne: false
            referencedRelation: "PatientProfile"
            referencedColumns: ["id"]
          },
        ]
      }
      PatientProfile: {
        Row: {
          createdAt: string
          id: string
          updatedAt: string
          userId: string
        }
        Insert: {
          createdAt?: string
          id: string
          updatedAt: string
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "PatientProfile_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      ProfessionalVerification: {
        Row: {
          createdAt: string
          documentId: string
          id: string
          license: string
          psychologistId: string
          reviewedAt: string | null
          reviewedBy: string | null
          reviewNote: string
          status: Database["public"]["Enums"]["VerificationStatus"]
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          documentId: string
          id: string
          license: string
          psychologistId: string
          reviewedAt?: string | null
          reviewedBy?: string | null
          reviewNote?: string
          status?: Database["public"]["Enums"]["VerificationStatus"]
          updatedAt: string
        }
        Update: {
          createdAt?: string
          documentId?: string
          id?: string
          license?: string
          psychologistId?: string
          reviewedAt?: string | null
          reviewedBy?: string | null
          reviewNote?: string
          status?: Database["public"]["Enums"]["VerificationStatus"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ProfessionalVerification_psychologistId_fkey"
            columns: ["psychologistId"]
            isOneToOne: false
            referencedRelation: "PsychologistProfile"
            referencedColumns: ["id"]
          },
        ]
      }
      PsychologistApproach: {
        Row: {
          approachId: string
          createdAt: string
          psychologistId: string
          updatedAt: string
        }
        Insert: {
          approachId: string
          createdAt?: string
          psychologistId: string
          updatedAt: string
        }
        Update: {
          approachId?: string
          createdAt?: string
          psychologistId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "PsychologistApproach_approachId_fkey"
            columns: ["approachId"]
            isOneToOne: false
            referencedRelation: "TherapeuticApproach"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PsychologistApproach_psychologistId_fkey"
            columns: ["psychologistId"]
            isOneToOne: false
            referencedRelation: "PsychologistProfile"
            referencedColumns: ["id"]
          },
        ]
      }
      PsychologistProfile: {
        Row: {
          acceptingPatients: boolean
          accessibility: string
          ageRange: string
          bio: string
          certifications: string
          city: string
          contactMethods: string
          createdAt: string
          duration: number
          education: string
          expectations: string
          experience: string
          firstSession: string
          gender: string
          goalSetting: string
          homework: string
          id: string
          languages: string[] | null
          license: string
          modality: string
          philosophy: string
          photoId: string | null
          population: string
          price: number
          processLength: string
          pronouns: string
          styles: Json
          tools: string
          university: string
          updatedAt: string
          userId: string
          verificationStatus: Database["public"]["Enums"]["VerificationStatus"]
          yearsExperience: number
        }
        Insert: {
          acceptingPatients?: boolean
          accessibility?: string
          ageRange?: string
          bio?: string
          certifications?: string
          city?: string
          contactMethods?: string
          createdAt?: string
          duration?: number
          education?: string
          expectations?: string
          experience?: string
          firstSession?: string
          gender?: string
          goalSetting?: string
          homework?: string
          id: string
          languages?: string[] | null
          license?: string
          modality?: string
          philosophy?: string
          photoId?: string | null
          population?: string
          price?: number
          processLength?: string
          pronouns?: string
          styles: Json
          tools?: string
          university?: string
          updatedAt: string
          userId: string
          verificationStatus?: Database["public"]["Enums"]["VerificationStatus"]
          yearsExperience?: number
        }
        Update: {
          acceptingPatients?: boolean
          accessibility?: string
          ageRange?: string
          bio?: string
          certifications?: string
          city?: string
          contactMethods?: string
          createdAt?: string
          duration?: number
          education?: string
          expectations?: string
          experience?: string
          firstSession?: string
          gender?: string
          goalSetting?: string
          homework?: string
          id?: string
          languages?: string[] | null
          license?: string
          modality?: string
          philosophy?: string
          photoId?: string | null
          population?: string
          price?: number
          processLength?: string
          pronouns?: string
          styles?: Json
          tools?: string
          university?: string
          updatedAt?: string
          userId?: string
          verificationStatus?: Database["public"]["Enums"]["VerificationStatus"]
          yearsExperience?: number
        }
        Relationships: [
          {
            foreignKeyName: "PsychologistProfile_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      PsychologistSpecialty: {
        Row: {
          createdAt: string
          psychologistId: string
          specialtyId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          psychologistId: string
          specialtyId: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          psychologistId?: string
          specialtyId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "PsychologistSpecialty_psychologistId_fkey"
            columns: ["psychologistId"]
            isOneToOne: false
            referencedRelation: "PsychologistProfile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "PsychologistSpecialty_specialtyId_fkey"
            columns: ["specialtyId"]
            isOneToOne: false
            referencedRelation: "Specialty"
            referencedColumns: ["id"]
          },
        ]
      }
      RateLimit: {
        Row: {
          count: number
          createdAt: string
          expiresAt: string
          key: string
          updatedAt: string
        }
        Insert: {
          count?: number
          createdAt?: string
          expiresAt: string
          key: string
          updatedAt: string
        }
        Update: {
          count?: number
          createdAt?: string
          expiresAt?: string
          key?: string
          updatedAt?: string
        }
        Relationships: []
      }
      Report: {
        Row: {
          createdAt: string
          id: string
          reason: string
          reporterId: string
          resolution: string
          status: string
          targetId: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id: string
          reason: string
          reporterId: string
          resolution?: string
          status?: string
          targetId: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          id?: string
          reason?: string
          reporterId?: string
          resolution?: string
          status?: string
          targetId?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Report_reporterId_fkey"
            columns: ["reporterId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Report_targetId_fkey"
            columns: ["targetId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Session: {
        Row: {
          createdAt: string
          expiresAt: string
          id: string
          tokenHash: string
          updatedAt: string
          userId: string
        }
        Insert: {
          createdAt?: string
          expiresAt: string
          id: string
          tokenHash: string
          updatedAt: string
          userId: string
        }
        Update: {
          createdAt?: string
          expiresAt?: string
          id?: string
          tokenHash?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Session_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Specialty: {
        Row: {
          createdAt: string
          id: string
          name: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id: string
          name: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          id?: string
          name?: string
          updatedAt?: string
        }
        Relationships: []
      }
      StoredFile: {
        Row: {
          createdAt: string
          id: string
          kind: string
          mime: string
          name: string
          ownerId: string
          storageKey: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id: string
          kind: string
          mime: string
          name: string
          ownerId: string
          storageKey: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          id?: string
          kind?: string
          mime?: string
          name?: string
          ownerId?: string
          storageKey?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "StoredFile_ownerId_fkey"
            columns: ["ownerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      TherapeuticApproach: {
        Row: {
          createdAt: string
          description: string
          id: string
          name: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          description: string
          id: string
          name: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          description?: string
          id?: string
          name?: string
          updatedAt?: string
        }
        Relationships: []
      }
      User: {
        Row: {
          active: boolean
          authId: string | null
          consentAt: string
          createdAt: string
          email: string
          id: string
          isDemo: boolean
          name: string
          onboardingComplete: boolean
          passwordHash: string
          role: Database["public"]["Enums"]["Role"]
          updatedAt: string
        }
        Insert: {
          active?: boolean
          authId?: string | null
          consentAt: string
          createdAt?: string
          email: string
          id: string
          isDemo?: boolean
          name: string
          onboardingComplete?: boolean
          passwordHash: string
          role: Database["public"]["Enums"]["Role"]
          updatedAt: string
        }
        Update: {
          active?: boolean
          authId?: string | null
          consentAt?: string
          createdAt?: string
          email?: string
          id?: string
          isDemo?: boolean
          name?: string
          onboardingComplete?: boolean
          passwordHash?: string
          role?: Database["public"]["Enums"]["Role"]
          updatedAt?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_rate_limit: {
        Args: {
          p_key: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      respond_interest: {
        Args: {
          p_accept: boolean
          p_interest_id: string
          p_psychologist_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      AppointmentStatus: "REQUESTED" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
      InterestStatus: "PENDING" | "ACCEPTED" | "DECLINED"
      Role: "PATIENT" | "PSYCHOLOGIST" | "ADMIN"
      VerificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      AppointmentStatus: ["REQUESTED", "CONFIRMED", "CANCELLED", "COMPLETED"],
      InterestStatus: ["PENDING", "ACCEPTED", "DECLINED"],
      Role: ["PATIENT", "PSYCHOLOGIST", "ADMIN"],
      VerificationStatus: ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"],
    },
  },
} as const
