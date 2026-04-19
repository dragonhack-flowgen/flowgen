import { type Flow } from "@/types/flow"

export const MOCK_FLOWS: Flow[] = [
  {
    id: "1",
    name: "User Onboarding",
    purpose: "Guide new users from signup to first successful action",
    end_outcome: "User completes first project creation",
    start_page: "https://app.example.com/signup",
    start_conditions: "User has a valid email address",
    description:
      "Walk through the complete onboarding experience: sign up with email, verify account, complete profile setup, and create the first project. Ensure each step has clear guidance and fallback for errors.",
    status: "complete",
    steps_md: `1. Navigate to the signup page
2. Fill in email, password, and confirm password fields
3. Click the "Create Account" button
4. Check email inbox and click the verification link
5. Complete the profile setup wizard
6. Click "Create your first project" on the dashboard`,
    video_url: "https://example.com/videos/onboarding.mp4",
    created_at: "2026-04-18T10:00:00Z",
    updated_at: "2026-04-19T08:30:00Z",
  },
  {
    id: "2",
    name: "Checkout Process",
    purpose: "Complete a purchase from cart to confirmation",
    end_outcome: "User sees order confirmation page",
    start_page: "https://app.example.com/cart",
    start_conditions: "Cart contains at least one item",
    description:
      "Covers cart review, payment details, and confirmation page. Test the full checkout with a discount code applied.",
    status: "draft",
    steps_md: `1. Review items in the shopping cart
2. Click "Proceed to Checkout"
3. Enter shipping address details
4. Select a payment method and enter card details
5. Click "Place Order" and verify the confirmation page`,
    video_url: null,
    created_at: "2026-04-17T14:00:00Z",
    updated_at: "2026-04-18T16:00:00Z",
  },
  {
    id: "3",
    name: "Password Reset",
    purpose: "Allow users to securely reset their password",
    end_outcome: "User logs in with the new password",
    start_page: "https://app.example.com/login",
    start_conditions: null,
    description:
      "Flow for forgot-password email, token validation, and reset. Verify the user receives the email and can set a new password.",
    status: "generating",
    steps_md: null,
    video_url: null,
    created_at: "2026-04-16T09:00:00Z",
    updated_at: "2026-04-17T12:00:00Z",
  },
  {
    id: "4",
    name: "Admin Dashboard Setup",
    purpose: "Configure the admin dashboard for first use",
    end_outcome: "Admin dashboard displays configured widgets",
    start_page: "https://app.example.com/admin",
    start_conditions: "User has admin role",
    description:
      "Initial admin setup including roles, permissions, and defaults. Walk through creating an admin account and configuring dashboard widgets.",
    status: "pending_review",
    steps_md: `1. Log in with admin credentials
2. Navigate to Settings > Roles & Permissions
3. Create a new role with custom permissions
4. Add dashboard widgets from the widget gallery
5. Save dashboard layout and verify it persists on refresh`,
    video_url: null,
    created_at: "2026-04-15T11:00:00Z",
    updated_at: "2026-04-16T14:00:00Z",
  },
  {
    id: "5",
    name: "Profile Editing",
    purpose: "Update user profile information",
    end_outcome: "Profile changes are saved and visible",
    start_page: "https://app.example.com/profile",
    start_conditions: null,
    description:
      "User profile updates including image upload and preferences. Test editing display name, bio, and uploading a new avatar.",
    status: "recording",
    steps_md: `1. Navigate to your profile page
2. Click "Edit Profile"
3. Update display name and bio fields
4. Upload a new profile picture
5. Click "Save Changes" and verify updates appear`,
    video_url: "https://example.com/videos/profile-edit.mp4",
    created_at: "2026-04-14T08:00:00Z",
    updated_at: "2026-04-12T10:00:00Z",
  },
]
