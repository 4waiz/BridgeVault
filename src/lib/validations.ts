import { z } from "zod";

export const leadSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(200),
  first_name: z.string().max(100).optional().default(""),
  last_name: z.string().max(100).optional().default(""),
  job_title: z.string().max(200).optional().default(""),
  company: z.string().max(200).optional().default(""),
  email: z
    .string()
    .email("Invalid email")
    .max(200)
    .optional()
    .or(z.literal("")),
  phone: z.string().max(50).optional().default(""),
  website: z.string().max(500).optional().default(""),
  address: z.string().max(500).optional().default(""),
  city: z.string().max(100).optional().default(""),
  country: z.string().max(100).optional().default(""),
  notes: z.string().max(5000).optional().default(""),
  status: z
    .enum(["new", "reviewed", "contacted", "qualified", "archived", "draft"])
    .default("new"),
  tags: z.array(z.string()).optional().default([]),
});

export type LeadFormData = z.infer<typeof leadSchema>;

/** Relaxed schema for drafts — only requires partial data */
export const draftLeadSchema = z.object({
  full_name: z.string().max(200).optional().default(""),
  first_name: z.string().max(100).optional().default(""),
  last_name: z.string().max(100).optional().default(""),
  job_title: z.string().max(200).optional().default(""),
  company: z.string().max(200).optional().default(""),
  email: z.string().max(200).optional().default(""),
  phone: z.string().max(50).optional().default(""),
  website: z.string().max(500).optional().default(""),
  address: z.string().max(500).optional().default(""),
  city: z.string().max(100).optional().default(""),
  country: z.string().max(100).optional().default(""),
  notes: z.string().max(5000).optional().default(""),
});

export type DraftLeadFormData = z.infer<typeof draftLeadSchema>;

export const signInSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type SignInFormData = z.infer<typeof signInSchema>;

export const signUpSchema = signInSchema.extend({
  full_name: z.string().min(1, "Name is required").max(200),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
