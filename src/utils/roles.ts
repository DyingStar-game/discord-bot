/**
 * Discord roles configuration class
 */
export class Roles {
	// Administration
	static readonly ADMIN = '1432499495895302174';

	// Infrastructure Development
	static readonly NETWORK_INFRASTRUCTURE_DEV = '1432499495882457228';

	// Moderation
	static readonly MODERATION = '1432499495882457227';

	// Leadership
	static readonly SUPERVISOR = '1432499495522013354';
	static readonly LEAD = '1432499495882457225';
	static readonly SUB_LEAD = '1432499495882457224';

	// Dump
	static readonly DUMP = '1437787095060975638';

	// Development
	static readonly BOT = '1432499495882457223';
	static readonly WEB = '1432499495882457222';
	static readonly W_SITE = '1432499495882457221';
	static readonly W_DISCORD = '1432499495882457220';
	static readonly W_LAUNCHER = '1432499495882457219';

	// Tech & Development
	static readonly TECH_DEVELOPMENT = '1432499495874199612';
	static readonly TD_SYSTEMS_INTEGRATION = '1432499495874199611';
	static readonly TD_PIPELINE_INTERNAL_TOOLS = '1432499495874199610';
	static readonly NETWORK_GAME = '1432499495874199609';
	static readonly PLANET_TECH = '1432499495874199608';

	// Narrative Design
	static readonly NARRATIVE_DESIGN = '1432499495874199607';
	static readonly ND_UNIVERS_CONTEXTE = '1432499495874199606';
	static readonly ND_SOCIETES_CULTURES = '1432499495874199605';
	static readonly ND_FACTIONS_ORGANISATIONS = '1432499495874199604';
	static readonly ND_TECHNOLOGIES_SCIENCES = '1432499495874199603';
	static readonly ND_WORLDS_ENVIRONNEMENTAL = '1432499495861747893';
	static readonly ND_TRANSPORT_INFRASTRUCTURE = '1432499495861747892';
	static readonly ND_NARRATION_LORE = '1432499495861747891';

	// Game Design
	static readonly GAME_DESIGN = '1432499495861747890';
	static readonly GD_GAMEPLAY = '1432499495861747889';
	static readonly GD_LEVEL_WORLD_DESIGN = '1432499495861747888';
	static readonly GD_DEV_GAMEPLAY = '1432499495861747887';
	static readonly GD_TRANSPORT = '1432499495861747886';
	static readonly GD_MINAGE = '1432499495861747885';

	// Concept Creation
	static readonly CREA_CONCEPT = '1432499495861747884';
	static readonly CC_3D_MODELING = '1432499495840514188';

	// UI/UX
	static readonly UI_UX = '1432499495840514187';

	// Audio
	static readonly AUDIO = '1432499495840514186';
	static readonly A_SFX = '1432499495840514185';
	static readonly A_MUSIC = '1432499495840514184';
	static readonly A_RECORDING = '1432499495840514183';
	static readonly A_MIX = '1432499495840514182';
	static readonly A_INTEGRATION = '1432499495840514181';
	static readonly A_DEVELOPER = '1432499495840514180';

	// VFX and others
	static readonly VFX = '1432499495840514179';
	static readonly QA_PLAY_TEST = '1432499495522013356';
	static readonly CUTSCENE_VIDEO = '1432499495522013355';

	/**
	 * Role groups to facilitate checks
	 */
	static readonly Groups = {
		// Administration and moderation roles
		STAFF: [Roles.MODERATION],

		// Leadership roles
		LEADERSHIP: [Roles.SUPERVISOR, Roles.LEAD, Roles.SUB_LEAD],

		// All web development roles
		WEB_DEV: [Roles.WEB, Roles.W_SITE, Roles.W_DISCORD, Roles.W_LAUNCHER],

		// All Tech & Development roles
		TECH_DEV: [Roles.TECH_DEVELOPMENT, Roles.TD_SYSTEMS_INTEGRATION, Roles.TD_PIPELINE_INTERNAL_TOOLS, Roles.NETWORK_GAME, Roles.PLANET_TECH],

		// All Narrative Design roles
		NARRATIVE: [
			Roles.NARRATIVE_DESIGN,
			Roles.ND_UNIVERS_CONTEXTE,
			Roles.ND_SOCIETES_CULTURES,
			Roles.ND_FACTIONS_ORGANISATIONS,
			Roles.ND_TECHNOLOGIES_SCIENCES,
			Roles.ND_WORLDS_ENVIRONNEMENTAL,
			Roles.ND_TRANSPORT_INFRASTRUCTURE,
			Roles.ND_NARRATION_LORE
		],

		// All Game Design roles
		GAME_DESIGN: [Roles.GAME_DESIGN, Roles.GD_GAMEPLAY, Roles.GD_LEVEL_WORLD_DESIGN, Roles.GD_DEV_GAMEPLAY, Roles.GD_TRANSPORT, Roles.GD_MINAGE],

		// All Concept Creation roles
		CREATIVE: [Roles.CREA_CONCEPT, Roles.CC_3D_MODELING, Roles.UI_UX, Roles.VFX],

		// All Audio roles
		AUDIO: [Roles.AUDIO, Roles.A_SFX, Roles.A_MUSIC, Roles.A_RECORDING, Roles.A_MIX, Roles.A_INTEGRATION, Roles.A_DEVELOPER],

		// Supervision and quality roles
		QUALITY: [Roles.QA_PLAY_TEST, Roles.CUTSCENE_VIDEO],

		// All development roles (web + bot + tech)
		ALL_DEVELOPERS: [
			Roles.BOT,
			Roles.WEB,
			Roles.W_SITE,
			Roles.W_DISCORD,
			Roles.W_LAUNCHER,
			Roles.TECH_DEVELOPMENT,
			Roles.TD_SYSTEMS_INTEGRATION,
			Roles.TD_PIPELINE_INTERNAL_TOOLS,
			Roles.NETWORK_GAME,
			Roles.PLANET_TECH,
			Roles.NETWORK_INFRASTRUCTURE_DEV
		]
	};

	/**
	 * Checks if a member has at least one of the specified roles
	 * @param memberRoles - The roles of the member to check
	 * @param roleIds - The roles to check for
	 * @returns True if the member has at least one of the specified roles, false otherwise
	 */
	static hasAnyRole(memberRoles: Set<string> | Map<string, any>, roleIds: string[]): boolean {
		return roleIds.some((roleId) => memberRoles.has(roleId));
	}

	/**
	 * Checks if a member has all the specified roles
	 * @param memberRoles - The roles of the member to check
	 * @param roleIds - The roles to check for
	 * @returns True if the member has all the specified roles, false otherwise
	 */
	static hasAllRoles(memberRoles: Set<string> | Map<string, any>, roleIds: string[]): boolean {
		return roleIds.every((roleId) => memberRoles.has(roleId));
	}
}
