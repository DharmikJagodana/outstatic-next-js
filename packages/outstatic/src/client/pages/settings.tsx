import { AdminLayout } from '@/components'
import GitHubBranchSearch from '@/components/GitHubBranchSearch'
import GitHubRepoSearch from '@/components/GitHubRepoSearch'
import { MetadataBuilder } from '@/components/MetadataBuilder'
import { Button } from '@/components/ui/shadcn/button'
import { useCollections } from '@/utils/hooks/useCollections'
import { useState } from 'react'

export default function Settings() {
  const [rebuild, setRebuilding] = useState(false)
  const { data: collections } = useCollections()

  return (
    <AdminLayout title="Settings">
      <div className="mb-8 flex h-12 items-center">
        <h1 className="mr-12 text-2xl">Settings</h1>
      </div>
      <div className="max-w-lg">
        <div className="mb-8 max-w-2xl p-8 px-4 md:p-8 text-black bg-white rounded-lg border border-gray-200 shadow-md prose prose-base">
          <h2>Environment</h2>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-900">
              Repository
            </label>
            <GitHubRepoSearch />
          </div>
          <div className="mt-4">
            <label className="block mb-2 text-sm font-medium text-gray-900">
              Branch
            </label>
            <GitHubBranchSearch />
          </div>
          <p className="text-sm">
            <span className="font-semibold">Optional:</span> You can set default
            repository and branch variables directly on your .env files. To
            learn more{' '}
            <a
              href="https://outstatic.com/docs/environment-variables"
              target="_blank"
              rel="noreferrer"
              className="underline font-semibold"
            >
              click here
            </a>
            .
          </p>
        </div>
        {collections && collections.length > 0 ? (
          <div className="mb-8 max-w-2xl p-8 px-4 md:p-8 text-black bg-white rounded-lg border border-gray-200 shadow-md prose prose-base">
            <h2>Metadata</h2>
            <div className="flex flex-row items-center">
              <Button disabled={rebuild} onClick={() => setRebuilding(true)}>
                {rebuild ? 'Rebuilding...' : 'Rebuild Metadata'}
              </Button>
              <MetadataBuilder
                className="pl-2"
                rebuild={rebuild}
                onComplete={() => setRebuilding(false)}
              />
            </div>
            <p className="text-sm">
              If you&apos;ve made changes outside of outstatic, or if you are
              seeing posts with incorrect metadata, you can rebuild your
              metadata and automatically deploy those changes to your site.
            </p>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  )
}
