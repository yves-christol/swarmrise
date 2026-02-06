// Realistic first names and surnames for test users
import {
  internalMutation,
  internalQuery,
  internalAction,
  action,
  ActionCtx,
} from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

// Shared handler logic for populating avatars
async function populateAvatarsHandler(
  ctx: ActionCtx,
  orgaId: Id<"orgas">
): Promise<{ updatedCount: number; failedCount: number }> {
  // Get all members
  const members = await ctx.runQuery(internal.dataTest.users.getMembersForAvatars, {
    orgaId,
  });

  let updatedCount = 0;
  let failedCount = 0;

  // Process members in batches to avoid overwhelming the external service
  const BATCH_SIZE = 10;
  for (let i = 0; i < members.length; i += BATCH_SIZE) {
    const batch = members.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (member: { memberId: Id<"members">; personId: Id<"users">; email: string }) => {
        try {
          // Generate unique avatar URL from email
          const seed = encodeURIComponent(member.email);
          const avatarUrl = `https://i.pravatar.cc/150?u=${seed}`;

          // Fetch the image
          const response = await fetch(avatarUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch avatar: ${response.status}`);
          }

          // Get the image as a blob
          const blob = await response.blob();

          // Store in Convex storage
          const storageId = await ctx.storage.store(blob);

          // Get the storage URL
          const storageUrl = await ctx.storage.getUrl(storageId);
          if (!storageUrl) {
            throw new Error("Failed to get storage URL");
          }

          // Update the member with the storage URL
          await ctx.runMutation(internal.dataTest.users.updateMemberAvatar, {
            memberId: member.memberId,
            personId: member.personId,
            pictureURL: storageUrl,
          });

          updatedCount++;
        } catch (error) {
          console.error(`Failed to update avatar for ${member.email}:`, error);
          failedCount++;
        }
      })
    );
  }

  return { updatedCount, failedCount };
}

const FIRST_NAMES = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
  "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
  "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
  "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
  "Timothy", "Deborah", "Ronald", "Stephanie", "Jason", "Rebecca", "Edward", "Sharon",
  "Jeffrey", "Laura", "Ryan", "Cynthia", "Jacob", "Kathleen", "Gary", "Amy",
  "Nicholas", "Angela", "Eric", "Shirley", "Jonathan", "Anna", "Stephen", "Brenda",
  "Larry", "Pamela", "Justin", "Emma", "Scott", "Nicole", "Brandon", "Helen",
  "Benjamin", "Samantha", "Samuel", "Katherine", "Frank", "Debra", "Gregory", "Rachel",
  "Raymond", "Carolyn", "Alexander", "Janet", "Patrick", "Virginia", "Jack", "Maria",
  "Dennis", "Heather", "Jerry", "Diane", "Tyler", "Julie", "Aaron", "Joyce",
  "Jose", "Victoria", "Henry", "Kelly", "Adam", "Christina", "Douglas", "Joan",
  "Nathan", "Evelyn", "Zachary", "Lauren", "Kyle", "Judith", "Noah", "Megan",
  "Ethan", "Cheryl", "Jeremy", "Andrea", "Walter", "Hannah", "Christian", "Jacqueline",
  "Keith", "Martha", "Roger", "Gloria", "Terry", "Teresa", "Gerald", "Sara",
  "Harold", "Janice", "Sean", "Marie", "Austin", "Julia", "Carl", "Grace",
  "Arthur", "Judy", "Lawrence", "Theresa", "Dylan", "Madison", "Jesse", "Beverly",
  "Jordan", "Denise", "Bryan", "Marilyn", "Billy", "Amber", "Joe", "Danielle",
  "Bruce", "Rose", "Gabriel", "Brittany", "Logan", "Diana", "Alan", "Abigail",
  "Juan", "Jane", "Wayne", "Lori", "Roy", "Olivia", "Ralph", "Jean",
  "Randy", "Catherine", "Eugene", "Frances", "Vincent", "Christine", "Russell", "Samantha",
  "Louis", "Marie", "Philip", "Janet", "Johnny", "Catherine", "Bobby", "Frances",
  "Howard", "Christine", "Willie", "Samantha", "Ethan", "Marie", "Arthur", "Janet",
];

const SURNAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor",
  "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Sanchez",
  "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
  "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams",
  "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
  "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards",
  "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers",
  "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson", "Bailey", "Reed", "Kelly",
  "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson", "Watson", "Brooks",
  "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza", "Ruiz", "Hughes",
  "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers", "Long", "Ross",
  "Foster", "Jimenez", "Powell", "Jenkins", "Perry", "Russell", "Sullivan", "Bell",
  "Coleman", "Butler", "Henderson", "Barnes", "Gonzales", "Fisher", "Vasquez", "Simmons",
  "Romero", "Jordan", "Patterson", "Alexander", "Hamilton", "Graham", "Reynolds", "Griffin",
  "Wallace", "Moreno", "West", "Cole", "Hayes", "Bryant", "Herrera", "Gibson",
  "Ellis", "Tran", "Medina", "Aguilar", "Stevens", "Murray", "Ford", "Castro",
  "Marshall", "Owens", "Harrison", "Fernandez", "Mcdonald", "Woods", "Washington", "Kennedy",
  "Wells", "Vargas", "Henry", "Chen", "Freeman", "Webb", "Tucker", "Guzman",
  "Burns", "Crawford", "Olson", "Simpson", "Porter", "Hunter", "Gordon", "Mendez",
  "Silva", "Shaw", "Snyder", "Mason", "Dixon", "Munoz", "Hunt", "Hicks",
  "Holmes", "Palmer", "Wagner", "Black", "Robertson", "Boyd", "Rose", "Stone",
  "Salazar", "Fox", "Warren", "Johns", "Lane", "Harper", "Fox", "Riley",
  "Armstrong", "Carpenter", "Weaver", "Greene", "Lawrence", "Elliott", "Chavez", "Sims",
  "Austin", "Peters", "Kelley", "Franklin", "Lawson", "Fields", "Gutierrez", "Ryan",
  "Schmidt", "Carr", "Vasquez", "Castillo", "Wheeler", "Chapman", "Oliver", "Montgomery",
  "Richards", "Williamson", "Johnston", "Banks", "Meyer", "Bishop", "Mccoy", "Howell",
  "Alvarez", "Morrison", "Hansen", "Fernandez", "Garza", "Harvey", "Little", "Burton",
  "Stanley", "Nguyen", "George", "Jacobs", "Reid", "Kim", "Fuller", "Lynch",
];

const TEST_EMAIL_DOMAIN = "@test-swarmrise.com";

// Phone number prefixes for generating realistic fake phone numbers
const PHONE_PREFIXES = [
  "+1 (555)", "+1 (212)", "+1 (310)", "+1 (415)", "+1 (617)",
  "+1 (202)", "+1 (312)", "+1 (404)", "+1 (713)", "+1 (503)",
  "+44 20", "+44 161", "+44 121", "+33 1", "+33 6",
  "+49 30", "+49 89", "+61 2", "+61 3", "+81 3",
];

// Other contact types for random selection (excluding Mobile and LinkedIn which are always added)
type OtherContactType = "Email" | "Twitter" | "Website" | "Whatsapp" | "Facebook" | "Instagram" | "Address";
const OTHER_CONTACT_TYPES: OtherContactType[] = [
  "Email", "Twitter", "Website", "Whatsapp", "Facebook", "Instagram", "Address"
];

// Helper function to generate a fake phone number
function generateFakePhoneNumber(): string {
  const prefix = PHONE_PREFIXES[Math.floor(Math.random() * PHONE_PREFIXES.length)];
  const part1 = Math.floor(Math.random() * 900 + 100); // 100-999
  const part2 = Math.floor(Math.random() * 9000 + 1000); // 1000-9999
  return `${prefix} ${part1}-${part2}`;
}

// Helper function to generate a fake LinkedIn URL
function generateFakeLinkedIn(firstname: string, surname: string, index: number): string {
  const cleanFirst = firstname.toLowerCase().replace(/[^a-z]/g, "");
  const cleanSur = surname.toLowerCase().replace(/[^a-z]/g, "");
  // Add some variation with random numbers to simulate real LinkedIn URLs
  const randomSuffix = Math.floor(Math.random() * 900 + 100);
  return `https://linkedin.com/in/${cleanFirst}-${cleanSur}-${randomSuffix}${index}`;
}

// Helper arrays for generating random contact info values
const EMAIL_DOMAINS = ["gmail.com", "outlook.com", "yahoo.com", "proton.me", "icloud.com"];
const WEBSITE_TLDS = [".com", ".io", ".dev", ".me", ".co"];
const STREET_NAMES = ["Main St", "Oak Ave", "Park Blvd", "Market St", "Broadway", "First Ave", "Second St", "Tech Drive", "Innovation Way"];
const CITY_NAMES = ["San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA", "Boston, MA", "Denver, CO", "Chicago, IL", "Portland, OR"];

// Helper function to generate a random other contact info
function generateOtherContact(firstname: string, surname: string, index: number): { type: OtherContactType; value: string } {
  const type = OTHER_CONTACT_TYPES[Math.floor(Math.random() * OTHER_CONTACT_TYPES.length)];
  const cleanFirst = firstname.toLowerCase().replace(/[^a-z]/g, "");
  const cleanSur = surname.toLowerCase().replace(/[^a-z]/g, "");

  switch (type) {
    case "Email":
      return { type, value: `${cleanFirst}.${cleanSur}${index}@${EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)]}` };

    case "Twitter":
      return { type, value: `@${cleanFirst}${cleanSur}${Math.floor(Math.random() * 1000)}` };

    case "Website":
      return { type, value: `https://${cleanFirst}${cleanSur}${WEBSITE_TLDS[Math.floor(Math.random() * WEBSITE_TLDS.length)]}` };

    case "Whatsapp":
      return { type, value: generateFakePhoneNumber() };

    case "Facebook":
      return { type, value: `https://facebook.com/${cleanFirst}.${cleanSur}.${Math.floor(Math.random() * 10000)}` };

    case "Instagram":
      return { type, value: `@${cleanFirst}_${cleanSur}${Math.floor(Math.random() * 100)}` };

    case "Address":
      return {
        type,
        value: `${Math.floor(Math.random() * 9000 + 100)} ${STREET_NAMES[Math.floor(Math.random() * STREET_NAMES.length)]}, ${CITY_NAMES[Math.floor(Math.random() * CITY_NAMES.length)]}`,
      };

    default:
      return { type: "Website", value: `https://${cleanFirst}${cleanSur}.com` };
  }
}

// Helper function to generate contact infos for a test user
function generateContactInfos(firstname: string, surname: string, index: number): Array<{ type: "LinkedIn" | "Email" | "Mobile" | "Website" | "Twitter" | "Whatsapp" | "Facebook" | "Instagram" | "Address"; value: string }> {
  const contacts: Array<{ type: "LinkedIn" | "Email" | "Mobile" | "Website" | "Twitter" | "Whatsapp" | "Facebook" | "Instagram" | "Address"; value: string }> = [];

  // Always add a phone number
  contacts.push({
    type: "Mobile",
    value: generateFakePhoneNumber(),
  });

  // Always add a LinkedIn URL
  contacts.push({
    type: "LinkedIn",
    value: generateFakeLinkedIn(firstname, surname, index),
  });

  // Add one random other contact type
  const otherContact = generateOtherContact(firstname, surname, index);
  contacts.push(otherContact);

  return contacts;
}

/**
 * Create 80-120 test users with realistic random first names and surnames.
 * All test users will have emails ending with @test-swarmrise.com
 */
export const createTestUsers = internalMutation({
  args: {},
  returns: v.object({
    createdCount: v.number(),
    userIds: v.array(v.id("users")),
  }),
  handler: async (ctx): Promise<{
    createdCount: number;
    userIds: Id<"users">[];
  }> => {
    // Generate random number of users between 80 and 120
    const userCount = 80 + Math.floor(Math.random() * 41); // 80-120 inclusive
    
    const userIds: Id<"users">[] = [];
    const timestamp = Date.now();
    
    for (let i = 0; i < userCount; i++) {
      // Randomly select first name and surname
      const firstname = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
      
      // Create unique email using timestamp and index
      const email = `${firstname.toLowerCase()}.${surname.toLowerCase()}.${timestamp}.${i}${TEST_EMAIL_DOMAIN}`;
      
      // Check if user with this email already exists
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      
      if (existingUser) {
        // Skip if user already exists (shouldn't happen with timestamp, but just in case)
        continue;
      }
      
      // Generate contact infos for this user
      const contactInfos = generateContactInfos(firstname, surname, i);

      // Create the test user
      const userId = await ctx.db.insert("users", {
        firstname,
        surname,
        email,
        pictureURL: undefined,
        contactInfos,
        orgaIds: [],
      });
      
      userIds.push(userId);
    }
    
    return {
      createdCount: userIds.length,
      userIds,
    };
  },
});

/**
 * Internal query to get all members in an organization for avatar population.
 */
export const getMembersForAvatars = internalQuery({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.array(
    v.object({
      memberId: v.id("members"),
      personId: v.id("users"),
      email: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("members")
      .withIndex("by_orga", (q) => q.eq("orgaId", args.orgaId))
      .collect();

    return members.map((m) => ({
      memberId: m._id,
      personId: m.personId,
      email: m.email,
    }));
  },
});

/**
 * Internal mutation to update a member's pictureURL with a storage URL.
 */
export const updateMemberAvatar = internalMutation({
  args: {
    memberId: v.id("members"),
    personId: v.id("users"),
    pictureURL: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Update member
    await ctx.db.patch(args.memberId, {
      pictureURL: args.pictureURL,
    });

    // Update user
    const user = await ctx.db.get(args.personId);
    if (user) {
      await ctx.db.patch(args.personId, {
        pictureURL: args.pictureURL,
      });
    }

    return null;
  },
});

/**
 * Action to populate avatar images for all members in an organization.
 * Fetches images from pravatar.cc and stores them in Convex file storage.
 * This is the public version for manual invocation via CLI.
 */
export const populateMemberAvatars = action({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.object({
    updatedCount: v.number(),
    failedCount: v.number(),
  }),
  handler: async (ctx, args): Promise<{ updatedCount: number; failedCount: number }> => {
    return populateAvatarsHandler(ctx, args.orgaId);
  },
});

/**
 * Internal action to populate avatar images for all members in an organization.
 * Called by createTestOrganizationWithAvatars action.
 */
export const populateMemberAvatarsInternal = internalAction({
  args: {
    orgaId: v.id("orgas"),
  },
  returns: v.object({
    updatedCount: v.number(),
    failedCount: v.number(),
  }),
  handler: async (ctx, args): Promise<{ updatedCount: number; failedCount: number }> => {
    return populateAvatarsHandler(ctx, args.orgaId);
  },
});

/**
 * Delete all test users with emails ending in @test-swarmrise.com
 */
export const deleteTestUsers = internalMutation({
  args: {},
  returns: v.object({
    deletedCount: v.number(),
    deletedUserIds: v.array(v.id("users")),
  }),
  handler: async (ctx): Promise<{
    deletedCount: number;
    deletedUserIds: Id<"users">[];
  }> => {
    // Get all users
    const allUsers = await ctx.db
      .query("users")
      .collect();
    
    // Filter users with test email domain
    const testUsers = allUsers.filter((user) => 
      user.email.endsWith(TEST_EMAIL_DOMAIN)
    );
    
    const deletedUserIds: Id<"users">[] = [];
    
    // Delete each test user
    for (const testUser of testUsers) {
      // First, check if user has any members associated
      const relatedMembers = await ctx.db
        .query("members")
        .withIndex("by_person", (q) => q.eq("personId", testUser._id))
        .collect();
      
      // Delete related members first
      for (const member of relatedMembers) {
        await ctx.db.delete(member._id);
      }
      
      // Delete the user
      await ctx.db.delete(testUser._id);
      deletedUserIds.push(testUser._id);
    }
    
    return {
      deletedCount: deletedUserIds.length,
      deletedUserIds,
    };
  },
});

