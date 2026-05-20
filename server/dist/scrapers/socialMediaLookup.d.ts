export interface SocialMediaProfile {
    platform: string;
    username: string;
    exists: boolean;
    url: string;
    profileFound: boolean;
    statusCode?: number;
    timestamp: Date;
    resolvedUsername?: string;
    redirectedTo?: string;
    note?: string;
}
export interface SocialMediaLookupResult {
    searchedUsername: string;
    results: SocialMediaProfile[];
    totalPlatforms: number;
    platformsFound: number;
    timestamp: Date;
}
export declare function lookupUsername(username: string, platformsToSearch?: string[]): Promise<SocialMediaLookupResult>;
export declare function getAvailablePlatforms(): Array<{
    id: string;
    name: string;
}>;
//# sourceMappingURL=socialMediaLookup.d.ts.map