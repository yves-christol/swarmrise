// Realistic first names and surnames for test users
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

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
      
      // Create the test user
      const userId = await ctx.db.insert("users", {
        firstname,
        surname,
        email,
        pictureURL: undefined,
        contactInfos: [],
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

