/** Type guard — returns true when a login response requires MFA completion. */
export function isMfaChallenge(response) {
    return 'mfaRequired' in response && response.mfaRequired === true;
}
//# sourceMappingURL=api.js.map