# Overview

Bookcraft is an AI-powered book generation platform that allows users to create custom books using artificial intelligence. The platform leverages OpenAI's GPT models to generate book content and DALL-E 3 for image generation. Built with Next.js 15 and TypeScript, it provides a modern web application for creating both text-based books and picture books with an intuitive editor interface.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: Next.js 15 with App Router and Turbopack
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS with shadcn/ui components and Radix UI primitives
- **State Management**: React Context API for authentication and notifications
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **UI Components**: Custom component library built on Radix UI primitives
- **Environment**: Configured for Replit with host binding to 0.0.0.0:5000 and proxy support

## Authentication System
- **Primary**: Supabase Auth with JWT token verification
- **Fallback**: Mock authentication system for development when Supabase credentials are not configured
- **Token Management**: Server-side token verification using Supabase admin client
- **User Profiles**: Automatic user profile creation and management in Supabase database

## Database Architecture
- **Primary**: Supabase PostgreSQL with custom schema for books, users, and generated images
- **ORM Alternative**: Custom SupabaseDB utility class for database operations
- **Schema**: Supports book types (text/picture), user profiles, and image metadata
- **Data Models**: Strongly typed interfaces for Book, Profile, and GeneratedImage entities

## AI Content Generation
- **Text Generation**: OpenAI GPT-4o-mini for book content creation
- **Image Generation**: DALL-E 3 for cover images and picture book illustrations
- **Rate Limiting**: Built-in delays to prevent API rate limit violations
- **Content Processing**: Custom prompts for generating professional book content

## Payment Processing
- **Provider**: Stripe with full checkout session management
- **Features**: Support for multiple payment methods, bulk discounts, and webhook handling
- **Security**: Server-side payment verification and session management
- **UI**: Custom payment modal with Stripe-hosted checkout pages

## File Management
- **Image Storage**: Local filesystem storage in public/images directory
- **Download Generation**: PDF generation using jsPDF for book downloads
- **File Handling**: Automatic image downloading and local storage from OpenAI URLs

# External Dependencies

## Authentication & Database
- **Supabase**: Authentication, user management, and PostgreSQL database hosting
- **Environment Variables**: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

## AI Services
- **OpenAI API**: Text generation (GPT-4o-mini) and image generation (DALL-E 3)
- **Environment Variables**: OPENAI_API_KEY
- **Usage**: Book content creation, back cover text generation, and image creation

## Payment Processing
- **Stripe**: Payment processing, checkout sessions, and webhook handling
- **Environment Variables**: STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- **Features**: Credit card payments, bulk pricing, and automatic invoice generation

## Development Tools
- **Supabase CLI**: Database migrations and local development support
- **TypeScript**: Static type checking and development experience
- **ESLint**: Code linting and quality enforcement
- **Tailwind CSS**: Utility-first CSS framework for styling