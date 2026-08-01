# Walkthrough - Property Setup Wizard & Database Audit Fixes

This document details the fixes and strict database audit checks applied to resolve the room category name binding issues, false validation errors, and property publishing blocks.

## Changes Made

### 1. Gallery Images Array Mapping (Root Cause of Cast to [string] Failure)
* **File**: `backend/routes.js`
* **Change**: Fixed the mapping of gallery images during Super Admin property approval. Previously, the code blindly spread the array of objects `...gallery.images` (which are structured as `{ url, category, order }`) directly into the `images` array of the live `Homestay` collection, which expects an array of strings (`[{ type: String }]`). This triggered a MongoDB Mongoose validation `CastError`.
* **Fix**: Updated both mock and live database branches to extract only the `.url` property of the gallery images before spreading them:
  `images: gallery ? [gallery.coverImage, ...gallery.images.map(img => img && typeof img === 'object' ? img.url : img)].filter(Boolean) : []`

### 2. Super Admin Property Approval Type-Safety
* **File**: `backend/routes.js`
* **Change**: Added safe type-checking logic for `extraPersonAllowed` during Super Admin property approval mapping. Previously, the code blindly called `.includes()` on `extraPersonAllowed`, assuming it was always a string (like `"2 Extra Person"`). Since the value is stored as a `Number` in MongoDB, this call threw a `TypeError: r.extraPersonAllowed.includes is not a function`, causing review approvals to fail.
* **Fix**: Normalised the value so that it safely extracts numeric counts if it's a string, returns the value directly if it's a number, and defaults to `0` for empty/undefined types.

### 3. Unified Token Refresh Endpoint (Root Cause of "Failed to fetch states")
* **File**: `backend/routes.js`
* **Change**: Aligned the token refresh route with the frontend axios interceptor configuration. The frontend interceptor in `main.jsx` attempts to refresh expired tokens by calling `POST /api/auth/refresh`, whereas the backend registered `/api/auth/refresh-token`. This mismatch caused a 404 error during token renewal, forcing sudden unauthorized sign-outs and breaking subsequent settings fetches.
* **Fix**: Added support for both `/auth/refresh` and `/admin/auth/refresh` routes on the backend. The handler now securely supports JWT token refreshing for both **Super Admin** and **Homestay Owner** profiles.

### 3. Enforced Strict Live Database Connections
* **File**: `backend/server.js`
* **Change**: Reconfigured the database connection middleware. Instead of silently passing to `next()` when MongoDB fails to connect (which previously led to silent fallbacks to empty memory mock arrays), the server now rejects the request with a **503 Service Unavailable** error. This guarantees that all data is strictly written to and read from the live MongoDB Atlas database.
* **File**: `backend/routes.js`
* **Change**: Permanently disabled memory mock fallbacks by hardcoding `isMongoConnected()` to return `true`. This ensures the live database queries are unconditionally executed.

### 4. Stable Delta Updates on the Backend
* **File**: `backend/routes.js`
* **Change**: Replaced the blind delete-and-recreate logic of room categories on Step 4. Implemented a Delta Update that preserves the original database `_id` of existing room categories. Removed room categories are deleted along with their seasons and pricing records to prevent orphaned documents.

### 5. Room Category Name Syncing & Manual Editing
* **File**: `PropertySetupWizard.jsx`
* **Change**: Added a manual input field for "Room Category Name" to the edit room form. Selecting a "Room Type" automatically defaults the name field to match the selected type, resolving the `"Family Suite"` placeholder lock.

### 4. Frontend ID Mapping Migration
* **File**: `PropertySetupWizard.jsx`
* **Change**: Built a synchronization map of `temporaryRoomId -> databaseRoomId` by matching the index of saved rooms returned by the server. Automatically updated the frontend's local state keys in `seasons` and `rates` to use the database IDs immediately after saving Step 4.

## Verification & QA

* Verified that database connection is strictly validated on startup.
* Verified that room cards on Step 4 successfully bind to and display user-selected Room Types (e.g. Deluxe Room, Premium Room) and custom names.
* Verified that moving back and forth between wizard steps retains all room configuration parameters.
* Verified that room categories, seasons, and rates are successfully written and stored in MongoDB Atlas under matching references.

