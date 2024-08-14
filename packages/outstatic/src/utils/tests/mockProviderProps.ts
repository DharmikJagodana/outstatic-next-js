const mockProviderProps = {
  repoOwner: 'anything',
  repoSlug: 'anything',
  repoBranch: 'anything',
  contentPath: 'anything',
  monorepoPath: 'anything',
  session: null,
  initialApolloState: null,
  collections: ['collection1', 'collection2', 'collection3'],
  pages: [],
  hasOpenAIKey: false,
  hasChanges: false,
  setHasChanges: () => {},
  basePath: '',
  missingEnvVars: { required: {}, optional: {} },
  ostDetach: false,
  ostContent: 'anything',
  dashboardRoute: '/outstatic',
  githubGql: 'https://api.github.com/graphql',
  csrfToken: null
}

export default mockProviderProps
