import { onBeforeUnmount, onMounted, ref } from 'vue'

/** 响应式 matchMedia（断点判断用） */
export function useMediaQuery(query: string) {
  const matches = ref(false)
  let mql: MediaQueryList | null = null

  const handler = (e: MediaQueryListEvent) => {
    matches.value = e.matches
  }

  onMounted(() => {
    mql = window.matchMedia(query)
    matches.value = mql.matches
    mql.addEventListener('change', handler)
  })

  onBeforeUnmount(() => {
    mql?.removeEventListener('change', handler)
    mql = null
  })

  return matches
}
