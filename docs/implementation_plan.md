# Implementation Plan - Property Publish & Room Configuration Bugs

This plan addresses all five issues identified in the wizard publish flow, room category name bindings, validation errors, and database consistency.

## User Review Required

> [!IMPORTANT]
> The primary cause of the `"Room Category is not configured"` and `"Room Season date ranges are missing"` validation failures is that the backend deletes and recreates all rooms in step 4 on every save. This generates new MongoDB `_id`s, which instantly decouples existing seasons and rates because they still reference the deleted room category IDs.
>
> We will implement **stable Delta Updates** on the backend to preserve existing room IDs, and map temporary frontend IDs to database IDs inside the frontend's seasons and rates state objects immediately after saving Step 4.

## Proposed Changes

---

### Backend

#### [MODIFY] [models.js](file:///Users/chetansmac/Antigravity/Wow-Getway-2026/backend/models.js)
* Ensure all property fields except `propertyId` and `ownerId` have defaults (like empty strings) to prevent validation failures when saving empty initial drafts.

#### [MODIFY] [routes.js](file:///Users/chetansmac/Antigravity/Wow-Getway-2026/backend/routes.js)
* Modify `save-step` for **Step 4 (Rooms)** in both Mock and DB branches:
  * Do not delete and recreate all room documents.
  * Implement a Delta Update: update rooms that have valid IDs, delete rooms that are no longer in the list, and insert new ones.
  * Keep matching seasons and pricing records alive by not deleting their referenced room categories.

---

### Frontend

#### [MODIFY] [PropertySetupWizard.jsx](file:///Users/chetansmac/Antigravity/Wow-Getway-2026/frontend/src/modules/Homestay-Owner-Admin/pages/PropertySetupWizard.jsx)
* **Auto-update Room Name**: In the Room Edit details view, automatically default `name` to the selected room `type` when a room type is selected.
* **Manual Override Input**: Add a text field input for "Room Category Name" under the Room Type select so users can manually edit it if desired.
* **ID Mapping Sync**: In the `autoSave` response handler for Step 4, match the rooms list indexes to build a map of `temporaryId -> databaseId`. Replace all instances of temporary keys in `seasons` and `rates` state objects with the new database IDs. This ensures pricing/seasons are saved under the correct database IDs.

## Verification Plan

### Automated/Manual Verification
1. Open the owner portal, select "Add Homestay", and verify the draft initializes without 500 crashes.
2. Add multiple room categories (e.g. Deluxe Room, Premium Room), configure room numbers, select custom names, and upload images.
3. Configure seasons coverage (ensuring it spans a complete 12-month calendar year) and pricing.
4. Verify room cards display the correct selected room type instead of "Family Suite".
5. Click "Publish Property", and verify:
   * No false validation errors appear.
   * The property is saved successfully with status `"Submitted For Review"`.
   * The listing appears in the Homestay Owner's Inventory and the Super Admin's Pending Review panel.
