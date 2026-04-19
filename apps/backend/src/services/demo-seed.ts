import { eq } from "drizzle-orm"
import { db } from "../db/index.js"
import { flows, recordings } from "../db/schema.js"

const DEMO_FLOWS = [
  {
    id: "ecbe77ff-d547-4bbb-bbb5-f9eef1636643",
    name: "Outdated feature",
    description: "Add a project task, via the sidebar gui",
    status: "needs_update" as const,
    guide: `Open the EspoCRM application main page.

In the top navigation bar, click the plus icon link with id \`#nav-quick-create-dropdown\` and title \`Create\`.

In the opened dropdown menu, click the link \`a[data-action="quickCreate"][data-name="Task"]\` with visible text \`Task\`.

Wait for the Task create form to open at the route \`#Task/create\`.

In the required Name field, enter \`Project task\`.

In the Status field, keep the default value \`Not Started\`.

In the Priority field, keep the default value \`Normal\`.

In the required Assigned User field, keep the prefilled value.

Click the \`Save\` button in \`.record-buttons .btn[name="save"]\` with visible text \`Save\`.

Wait until the task record detail page loads and the new Task record is displayed.`,
    userDocs: `Open the CRM.

Use the quick-create menu from the sidebar or navigation area to start creating a new task.

Choose the task option.

Fill in the task name and any other details you want to track.

Leave the default status and priority as they are unless you need something different.

Make sure the task is assigned to the correct person.

Save the task.

Confirm that the new task record opens after saving.`,
    error: "Manually flagged for review",
    createdAt: new Date("2026-04-19T06:15:50.843284Z"),
    updatedAt: new Date("2026-04-19T06:17:03.188Z"),
  },
  {
    id: "ee5aa5a8-d4d3-4666-9e08-86c83989d4ab",
    name: "Create a case - step 1",
    description:
      "In the CRM, we want to create a case, fill it with dummy data and then finish by saving it and seeing it.",
    status: "completed" as const,
    guide: `Open the CRM at the main application URL and sign in.

In the top navigation bar, click the quick-create button \`#nav-quick-create-dropdown\` with the plus icon.

In the quick-create dropdown menu, click the link \`a[data-action="quickCreate"][data-name="Case"]\` labeled \`Case\`.

Wait for the Case create form to open at URL hash \`#Case/create\`.

In the Name field, enter \`Dummy Case 001\` into \`input.main-element.form-control[data-name="name"]\`.

In the Status field, select \`New\` from \`select.main-element.form-control[data-name="status"]\`.

In the Account field container \`[data-name="account"] .field[data-name="account"]\`, enter \`Demo Account\` into the related-record input and leave it as plain dummy text only if the UI allows free entry; otherwise leave the account field empty.

In the Contacts field container \`[data-name="contacts"] .field[data-name="contacts"]\`, leave the field empty.

In the Priority field, select \`Normal\` from \`select.main-element.form-control[data-name="priority"]\`.

In the Type field, select \`Question\` from \`select.main-element.form-control[data-name="type"]\`.

In the Description field, enter \`This is a dummy case created for testing.\` into \`textarea.main-element.form-control.auto-height[data-name="description"]\`.

Leave the Attachments field empty.

Click the \`Save\` button with \`data-action="save"\`.

Wait for the Case detail view to load.

Verify the saved record is displayed in the Case detail view and that the page shows the values \`Dummy Case 001\`, \`New\`, \`Normal\`, and \`Question\`.`,
    userDocs: `Open the CRM and sign in.

Start creating a new case from the quick-create menu in the top navigation.

Fill in the case form with sample information, including a name, status, priority, type, and description.

Leave optional fields blank if you do not need them for the test.

Save the case.

After saving, confirm that the case detail page opens and shows the information you entered.`,
    error: null,
    createdAt: new Date("2026-04-19T06:12:37.097724Z"),
    updatedAt: new Date("2026-04-19T06:14:31.356Z"),
  },
  {
    id: "7a534305-457e-4ea9-8b72-34ff7dee89fb",
    name: "Create a case",
    description:
      "In the https://demo.eu.espocrm.com/?l=en_US CRM, we want to create a case, fill it with dummy data and then finish by saving it and seeing it.",
    status: "completed" as const,
    guide: `Open https://demo.eu.espocrm.com/?l=en_US and wait for the CRM home page to load.

Navigate directly to the Cases create page by opening the URL https://demo.eu.espocrm.com/?l=en_US#Case/create.

In the Name field, type \`Demo Case 2026-04-19\` into the text input \`.field[data-name="name"] input.main-element[data-name="name"]\`.

In the Status field, select \`New\` from the dropdown \`.field[data-name="status"] select.main-element[data-name="status"]\`.

In the Priority field, select \`High\` from the dropdown \`.field[data-name="priority"] select.main-element[data-name="priority"]\`.

In the Type field, select \`Problem\` from the dropdown \`.field[data-name="type"] select.main-element[data-name="type"]\`.

In the Description field, enter \`This is a dummy case created for flow testing.\` into the textarea \`.field[data-name="description"] textarea.main-element[data-name="description"]\`.

Click the \`Save\` button in the record action bar \`.record-buttons [data-action="save"]\`.

Wait until the app navigates to the Case detail view URL pattern \`#Case/view/<id>\`.

Verify the saved Case detail page is visible and confirms the entered values, especially the Name \`Demo Case 2026-04-19\` and the Status \`New\`.`,
    userDocs: `Open the CRM and go to the page for creating a new case.

Fill in the case form with sample information such as a title, status, priority, type, and description.

Save the new case.

After saving, review the case detail page to confirm the record was created and the information is displayed correctly.`,
    error: null,
    createdAt: new Date("2026-04-19T06:01:14.256166Z"),
    updatedAt: new Date("2026-04-19T06:02:26.81Z"),
  },
]

const DEMO_RECORDINGS = [
  {
    id: "a7bb13e5-68ad-4288-a3e4-d1438317e15a",
    task: `Open the CRM at the main application URL and sign in.

In the top navigation bar, click the quick-create button \`#nav-quick-create-dropdown\` with the plus icon.

In the quick-create dropdown menu, click the link \`a[data-action="quickCreate"][data-name="Case"]\` labeled \`Case\`.

Wait for the Case create form to open at URL hash \`#Case/create\`.

In the Name field, enter \`Dummy Case 001\` into \`input.main-element.form-control[data-name="name"]\`.

In the Status field, select \`New\` from \`select.main-element.form-control[data-name="status"]\`.

In the Account field container \`[data-name="account"] .field[data-name="account"]\`, enter \`Demo Account\` into the related-record input and leave it as plain dummy text only if the UI allows free entry; otherwise leave the account field empty.

In the Contacts field container \`[data-name="contacts"] .field[data-name="contacts"]\`, leave the field empty.

In the Priority field, select \`Normal\` from \`select.main-element.form-control[data-name="priority"]\`.

In the Type field, select \`Question\` from \`select.main-element.form-control[data-name="type"]\`.

In the Description field, enter \`This is a dummy case created for testing.\` into \`textarea.main-element.form-control.auto-height[data-name="description"]\`.

Leave the Attachments field empty.

Click the \`Save\` button with \`data-action="save"\`.

Wait for the Case detail view to load.

Verify the saved record is displayed in the Case detail view and that the page shows the values \`Dummy Case 001\`, \`New\`, \`Normal\`, and \`Question\`.`,
    providerTaskId: "ee5aa5a8-d4d3-4666-9e08-86c83989d4ab",
    status: "completed" as const,
    artifacts: {
      acl: "public-read",
      error: null,
      fileKey: "EB8THaCLVN3pqB0ToGZLeoNbW3Itwuv2G7Y1AfUXhCZRVkFs",
      provider: "uploadthing",
      uploadUrl:
        "https://ieag9f5vxm.ufs.sh/f/EB8THaCLVN3pqB0ToGZLeoNbW3Itwuv2G7Y1AfUXhCZRVkFs",
    },
    manifest: null,
    error: null,
    createdAt: new Date("2026-04-19T06:17:36.969004Z"),
    updatedAt: new Date("2026-04-19T06:17:36.969Z"),
  },
  {
    id: "105e42fe-2ba6-4172-a5b6-64951d6717f8",
    task: `Open https://demo.eu.espocrm.com/?l=en_US and wait for the CRM home page to load.

Navigate directly to the Cases create page by opening the URL https://demo.eu.espocrm.com/?l=en_US#Case/create.

In the Name field, type \`Demo Case 2026-04-19\` into the text input \`.field[data-name="name"] input.main-element[data-name="name"]\`.

In the Status field, select \`New\` from the dropdown \`.field[data-name="status"] select.main-element[data-name="status"]\`.

In the Priority field, select \`High\` from the dropdown \`.field[data-name="priority"] select.main-element[data-name="priority"]\`.

In the Type field, select \`Problem\` from the dropdown \`.field[data-name="type"] select.main-element[data-name="type"]\`.

In the Description field, enter \`This is a dummy case created for flow testing.\` into the textarea \`.field[data-name="description"] textarea.main-element[data-name="description"]\`.

Click the \`Save\` button in the record action bar \`.record-buttons [data-action="save"]\`.

Wait until the app navigates to the Case detail view URL pattern \`#Case/view/<id>\`.

Verify the saved Case detail page is visible and confirms the entered values, especially the Name \`Demo Case 2026-04-19\` and the Status \`New\`.`,
    providerTaskId: "7a534305-457e-4ea9-8b72-34ff7dee89fb",
    status: "completed" as const,
    artifacts: {
      acl: "public-read",
      error: null,
      fileKey: "EB8THaCLVN3pxsILCn41dMQzLPJNutlAWOFBsU4fwrZC8IEq",
      provider: "uploadthing",
      uploadUrl:
        "https://ieag9f5vxm.ufs.sh/f/EB8THaCLVN3pxsILCn41dMQzLPJNutlAWOFBsU4fwrZC8IEq",
    },
    manifest: null,
    error: null,
    createdAt: new Date("2026-04-19T06:02:42.004927Z"),
    updatedAt: new Date("2026-04-19T06:02:42.004Z"),
  },
]

async function upsertFlow(
  flow: (typeof DEMO_FLOWS)[number]
) {
  const [existing] = await db
    .select()
    .from(flows)
    .where(eq(flows.id, flow.id))
    .limit(1)

  if (existing) {
    const [row] = await db
      .update(flows)
      .set({
        name: flow.name,
        description: flow.description,
        status: flow.status,
        guide: flow.guide,
        userDocs: flow.userDocs,
        error: flow.error,
        createdAt: flow.createdAt,
        updatedAt: flow.updatedAt,
      })
      .where(eq(flows.id, flow.id))
      .returning()

    return row
  }

  const [row] = await db.insert(flows).values(flow).returning()
  return row
}

async function upsertRecording(
  recording: (typeof DEMO_RECORDINGS)[number]
) {
  const [existing] = await db
    .select()
    .from(recordings)
    .where(eq(recordings.id, recording.id))
    .limit(1)

  if (existing) {
    await db
      .update(recordings)
      .set({
        task: recording.task,
        providerTaskId: recording.providerTaskId,
        status: recording.status,
        artifacts: recording.artifacts,
        manifest: recording.manifest,
        error: recording.error,
        createdAt: recording.createdAt,
        updatedAt: recording.updatedAt,
      })
      .where(eq(recordings.id, recording.id))
    return
  }

  await db.insert(recordings).values(recording)
}

export async function seedDemoData(options?: { log?: boolean }) {
  const seededFlows = []

  for (const flow of DEMO_FLOWS) {
    const row = await upsertFlow(flow)
    seededFlows.push(row)
  }

  for (const recording of DEMO_RECORDINGS) {
    await upsertRecording(recording)
  }

  if (options?.log ?? true) {
    console.log(
      `[demo-seed] Seeded ${DEMO_FLOWS.length} flows and ${DEMO_RECORDINGS.length} recordings`
    )
  }

  return {
    flows: seededFlows,
    recordings: DEMO_RECORDINGS,
  }
}
