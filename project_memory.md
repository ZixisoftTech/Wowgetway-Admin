# Wow Gateway - Permanent Master Project Directive (Version 1.0)

This document contains the Permanent Master Project Directive for the entire Wow Gateway ecosystem. This instruction applies to all current and future development, overriding any generic specifications.

---

## 🌟 Ecosystem Scope
This directive governs all panels, apps, and interfaces within the Wow Gateway environment:
- **Super Admin Panel**
- **Staff Panel**
- **Homestay Owner Panel**
- **Hotel Owner Panel**
- **Driver Panel**
- **Customer Portal**
- **Mobile Applications**
- **B2B Partner Panel**
- *All future dashboards, reports, forms, APIs, databases, components, and documentation.*

---

## 🏨 Project Vision & Quality Target
Wow Gateway is a **premium travel, hospitality, tourism, transportation, homestay, hotel, sightseeing, booking, and service ecosystem**. The target quality level is a solid **9.5+/10**, matching:
- **Airbnb + Stripe + Uber + Booking.com + OYO** (Luxury Hospitality Experience + Enterprise SaaS Quality).

---

## 🎨 Frontend Design System & Typography
- **Typography Standards:** Strict font scale and weight hierarchy using **Plus Jakarta Sans**, **Inter**, **SF Pro Display**, or **Manrope**.
- **Color Palettes:** Deep Indigo, Luxury Blue, Emerald, Teal, Amber, Soft Coral, Premium Gray, and Deep Charcoal. High contrast, luxury styling, zero neon saturation.
- **Whitespace Layouts:** Avoid dense or cramped sections; containers must breathe.
- **Animations:** **Framer Motion** transitions are mandatory across all pages, hover states, card transforms, loading indicators, charts, and drawers. Speed must be smooth, fast, and professional.

---

## 📱 Responsive QA Checklist
Every screen must pass the following responsive validation parameters (supporting 320px, 375px, 390px, 414px, 480px, 768px, 820px, 912px, 1024px, 1280px, 1366px, 1440px, 1600px, 1920px, 2560px, 3440px):
- [ ] No horizontal scrolling.
- [ ] No text or icon overflow.
- [ ] No broken cards or layout shifts.
- [ ] No button clipping or overlapping elements.
- [ ] No form, filter, chart, or sidebar display errors.
- [ ] Proper touch targets and typography scaling.

---

## ⚙️ Architecture & Code Standards
- **Tech Stack:** MERN Stack only (React, Vite, Tailwind CSS v4, Radix/ShadCN UI, Framer Motion, Redux Toolkit, React Query, Node, Express, MongoDB).
- **Backend Rules:** Modular routing, robust error wrapping, soft deletes, and connection resilience with local fallbacks.
- **Database Indexing:** MongoDB collections must enforce indexing, audit fields (`createdAt`, `updatedAt`), status tracking, and soft deletes.
- **Documentation Requirements:** The project root must maintain guides for:
  - Setup and installation.
  - Folder hierarchy.
  - DB collections and schema models.
  - API endpoints.
  - Component definitions.
  - Deployment rules.
