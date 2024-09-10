import { GET_DOCUMENT } from '@/graphql/queries/document'
import { chunk } from '@/utils/chunk'
import { createCommitApi } from '@/utils/createCommitApi'
import { hashFromUrl } from '@/utils/hashFromUrl'
import { useCreateCommit } from '@/utils/hooks/useCreateCommit'
import { GetDocumentData } from '@/utils/hooks/useGetDocument'
import { useGetFileInformation } from '@/utils/hooks/useGetFileInformation'
import useOid from '@/utils/hooks/useOid'
import useOutstatic from '@/utils/hooks/useOutstatic'
import { stringifyMetadata } from '@/utils/metadata/stringify'
import { MetadataSchema, OutstaticSchema } from '@/utils/metadata/types'
import request from 'graphql-request'
import matter from 'gray-matter'
import MurmurHash3 from 'imurmurhash'
import React, { HTMLAttributes, useEffect, useMemo, useState } from 'react'

interface MetadataBuilderProps extends HTMLAttributes<HTMLDivElement> {
  rebuild: boolean
  onComplete?: () => void
}

/** Describes the extraction of commit data from the gql query */
interface FileData {
  path: string
  oid: string
  commit: string
}

const isIndexable = (s: string) => {
  return /\.md(x|oc)?$/.test(s)
}

export const MetadataBuilder: React.FC<MetadataBuilderProps> = ({
  rebuild,
  onComplete,
  ...rest
}) => {
  const [total, setTotal] = useState(0)
  const [processed, setProcessed] = useState(0)
  const fetchOid = useOid()

  const mutation = useCreateCommit()

  const {
    repoOwner,
    repoSlug,
    repoBranch,
    monorepoPath,
    session,
    ostContent,
    githubGql
  } = useOutstatic()

  const { refetch, data } = useGetFileInformation({ enabled: false })

  useEffect(() => {
    if (rebuild) {
      refetch()
    }
  }, [rebuild, refetch])

  const files = useMemo(() => {
    if (!data) return []

    const o = data?.repository?.object

    const output: FileData[] = []
    const queue = o?.entries ? [...o.entries] : []
    while (queue.length > 0) {
      const next = queue.pop()
      if (next?.type === 'tree') {
        // subdir - add entries to queue
        queue.push(...(next.object.entries ?? []))
      } else if (next?.type === 'blob' && isIndexable(next.path)) {
        // file - add to output
        output.push({
          path: next.path,
          oid: `${next.object.oid}`,
          commit: hashFromUrl(`${next.object.commitUrl}`)
        })
      }
    }

    return output
  }, [data])

  // using useEffect ensures we run a single processing loop
  useEffect(() => {
    const takeAndProcess = async (o: FileData) => {
      const filePath = o.path.replace(/\.mdx?$/, '')
      const { repository } = await request<GetDocumentData>(
        githubGql,
        GET_DOCUMENT,
        {
          owner: repoOwner || session?.user?.login || '',
          name: repoSlug,
          mdPath: `${repoBranch}:${filePath}.md`,
          mdxPath: `${repoBranch}:${filePath}.mdx`
        },
        {
          authorization: `Bearer ${session?.access_token}`
        }
      )

      if (repository?.fileMD || repository?.fileMDX) {
        const text = repository?.fileMD?.text ?? repository?.fileMDX?.text ?? ''
        const m = matter(text)
        const state = MurmurHash3(text)
        const fmd: Partial<OutstaticSchema> = {
          ...m.data,
          slug:
            m.data.slug ?? o.path.replace(/^.+\/(.+)\.(md|mdoc|mdx)?/, '$1'),
          __outstatic: {
            commit: o.commit,
            hash: `${state.result()}`,
            path: monorepoPath ? o.path.replace(monorepoPath, '') : o.path
          }
        }
        return fmd
      }

      return undefined
    }

    const fn = async () => {
      setTotal(Math.max(files.length, 1))

      const chunkSize = 5 // TODO move to constants
      const queue = chunk(files, chunkSize)
      const docs: Record<string, unknown>[] = []
      const pendingOid = fetchOid()

      // process in chunks
      while (queue.length > 0) {
        const next = queue.pop()
        if (!next) continue
        const all = Promise.allSettled(
          next.map(async (fd) => {
            const meta = await takeAndProcess(fd)
            docs.push({
              ...meta,
              collection: fd.path
                .replace(ostContent, '') // strip root
                .replace(/^\/+/, '') // strip leading slashes
                .replace(/\/.+$/, '') // strip all after 1st slash
            })
            setProcessed((prev) => prev + 1)
          })
        )
        await all // lets fn() throw on a bad chunk
      }

      // await now that chunks are done in background
      const oid = await pendingOid

      if (docs.length > 0 && oid) {
        const parentHash = hashFromUrl(
          // @ts-ignore
          data?.repository?.object?.commitUrl ?? ''
        )
        const db: MetadataSchema = {
          commit: parentHash,
          generated: new Date().toUTCString(),
          metadata: docs.filter(Boolean)
        }
        const capi = createCommitApi({
          message: 'chore: Updates metadata DB',
          owner: repoOwner,
          name: repoSlug,
          branch: repoBranch,
          oid
        })

        capi.replaceFile(`${ostContent}/metadata.json`, stringifyMetadata(db))
        const payload = capi.createInput()

        try {
          mutation.mutate(payload)
        } catch (e) {
          console.error(e)
        }
      }
    }

    fn().catch(console.error)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files])

  useEffect(() => {
    if (processed === total && onComplete) {
      onComplete()
    }
  }, [onComplete, processed, total])

  if (!rebuild) {
    return <div {...rest} />
  }

  return (
    <div {...rest}>
      {processed}&nbsp;/&nbsp;{total}
    </div>
  )
}
