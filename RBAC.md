# Role-Based Access Control (RBAC) Specification

This document defines the permissions and responsibilities for platform and team-level roles within the application.

## 1. Role Hierarchy

### App Level Roles
*   **Superuser**: Platform owners. Full control over business data and security configurations.
*   **Admin**: Platform moderators. Focused on user support, safety, and infrastructure visibility.
*   **User**: Standard platform users. Focused on individual and team productivity.

### Team Level Roles
*   **Owner**: Team creator/primary responsible party. Full control over team identity and lifecycle.
*   **Admin**: Team manager. Manages membership and internal hierarchy.
*   **Member**: Team contributor. Collaborates on shared flows and assets.

---

## 2. Permission Matrix

### User Management
| Action | User | App Admin | App Superuser |
| :--- | :---: | :---: | :---: |
| View Own Profile | [x] | [x] | [x] |
| View All Profiles (Metadata) | | [x] | [x] |
| Ban / Unban Users | | [x] | [x] |
| Change User Tier | | | [x] |
| Change User Global Role | | | [x] |
| Grant Support Access to Admins | [x]* | | |

*\*Users must explicitly opt-in to allow Support Access to their account.*

### Team Management
| Action | Team Member | Team Admin | Team Owner |
| :--- | :---: | :---: | :---: |
| View Team Assets (Flows) | [x] | [x] | [x] |
| Invite / Remove Members | | [x] | [x] |
| Change Member Roles | | [x] | [x] |
| Edit Team Branding / Slug | | | [x] |
| Transfer Team Ownership | | | [x] |
| Delete Team | | | [x] |

### Content Inspection & Overrides
| Action | User | App Admin | App Superuser |
| :--- | :---: | :---: | :---: |
| View Own Assets | [x] | [x] | [x] |
| View Public Assets | [x] | [x] | [x] |
| View Private Assets (No Access) | | | |
| View Private Assets (Support Mode*) | | [x] | [x] |
| bypass RLS for Maintenance | | | [x] |

---

## 3. Support Access Logic
The platform implements a "Privacy First" support model:
1.  **Granting**: Only the **Subject User** can toggle `support_access_granted` on their own profile.
2.  **Accessing**: An **App Admin** or **Superuser** can only inspect the private logic of a user's flow if `has_support_access(target_user_id)` returns `true`.
3.  **Audit**: App Admins can always see the *existence* of flows (metadata) for moderation purposes, but the *content* (JSON data) remains encrypted/locked by RLS until support access is granted.
