<script setup>
import { computed, ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { mdiOpenInNew, mdiPlayCircleOutline } from '@mdi/js'
import { useLoginStore } from '@/stores/login'
import { usePermissions } from '@/composables/usePermissions'
import msalInstance from '@/services/msalConfig'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import CardBox from '@/components/CardBox.vue'
import BaseButton from '@/components/BaseButton.vue'
import SectionTitleLineWithButton from '@/components/SectionTitleLineWithButton.vue'

const sharePointFileUrl =
	'https://tecvasa.sharepoint.com/:v:/s/aqlara.apps/IQAc5RcX-0VCR7Fn7UZ9-B7_AfudV78LhI3VoRAKx6KA8uQ?e=ETRipa'

const siteHostName = 'tecvasa.sharepoint.com'
const sitePath = '/sites/aqlara.apps'
const documentLibraryPrefix = `${sitePath}/Documentos compartidos/`
const rawServerRelativeFilePath =
	'/sites/aqlara.apps/Documentos compartidos/SinaQ/video/APP SINAQ_DIPUTACION_CUENCA.mp4'

const loginStore = useLoginStore()

const { isAdmin: isAdminUser } = usePermissions()

const toBase64Url = (value) =>
	btoa(value)
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '')

const graphVideoUrl = ref('')
const graphBlobUrl = ref('')
const isResolvingGraph = ref(false)
const graphErrorMessage = ref('')
const activeSourceLabel = computed(() => sourceModes[currentSourceModeIndex.value])

const graphScopes = ['User.Read', 'Files.Read', 'Sites.Read.All']

const serverRelativeFilePath = computed(() => {
	return rawServerRelativeFilePath
})

const driveRelativeFilePath = computed(() => {
	if (serverRelativeFilePath.value.startsWith(documentLibraryPrefix)) {
		return serverRelativeFilePath.value.slice(documentLibraryPrefix.length)
	}

	return serverRelativeFilePath.value.replace(`${sitePath}/`, '').replace(/^Documentos compartidos\//, '')
})

const encodedServerRelativeFilePath = computed(() =>
	serverRelativeFilePath.value
		.split('/')
		.map((segment, index) => (index === 0 ? '' : encodeURIComponent(segment)))
		.join('/')
)

const directFileUrl = computed(() => `https://${siteHostName}${encodedServerRelativeFilePath.value}`)

const directDownloadUrl = computed(() => {
	const url = new URL(directFileUrl.value)
	url.searchParams.set('download', '1')
	return url.toString()
})

const revokeGraphBlobUrl = () => {
	if (graphBlobUrl.value) {
		URL.revokeObjectURL(graphBlobUrl.value)
		graphBlobUrl.value = ''
	}
}

const resolveGraphVideoUrl = async () => {
	try {
		const account = msalInstance.getAllAccounts()[0]
		if (!account) {
			graphErrorMessage.value = 'No hay una cuenta Microsoft activa en la sesion.'
			return
		}

		isResolvingGraph.value = true
		graphErrorMessage.value = ''

		const tokenResponse = await msalInstance
			.acquireTokenSilent({
				scopes: graphScopes,
				account
			})
			.catch(async (error) => {
				if (error instanceof InteractionRequiredAuthError) {
					return msalInstance.acquireTokenPopup({
						scopes: graphScopes,
						account
					})
				}
				throw error
			})

		const shareId = `u!${toBase64Url(sharePointFileUrl)}`
		const sharedMetadataResponse = await fetch(
			`https://graph.microsoft.com/v1.0/shares/${shareId}/driveItem?$select=id,name,%40microsoft.graph.downloadUrl,webUrl`,
			{
				headers: {
					Authorization: `Bearer ${tokenResponse.accessToken}`
				}
			}
		)

		let sharedLinkErrorMessage = ''

		if (sharedMetadataResponse.ok) {
			const sharedMetadata = await sharedMetadataResponse.json()
			if (sharedMetadata['@microsoft.graph.downloadUrl']) {
				graphVideoUrl.value = sharedMetadata['@microsoft.graph.downloadUrl']
				currentSourceModeIndex.value = 0
				hasLoadError.value = false
				await nextTick()
				videoEl.value?.load()
				return
			}
		} else {
			let sharedDetail = ''
			try {
				const sharedErrorPayload = await sharedMetadataResponse.json()
				sharedDetail = sharedErrorPayload?.error?.message || ''
			} catch {
				sharedDetail = ''
			}

			sharedLinkErrorMessage = sharedDetail
				? `Enlace compartido Graph ${sharedMetadataResponse.status}: ${sharedDetail}`
				: `Enlace compartido Graph ${sharedMetadataResponse.status}.`
		}

		const siteResponse = await fetch(
			`https://graph.microsoft.com/v1.0/sites/${siteHostName}:${sitePath}?$select=id,webUrl`,
			{
				headers: {
					Authorization: `Bearer ${tokenResponse.accessToken}`
				}
			}
		)

		if (!siteResponse.ok) {
			const siteErrorMessage =
				`Sitio Graph ${siteResponse.status}. El usuario puede tener acceso al archivo compartido, ` +
				'pero no al sitio completo.'

			graphErrorMessage.value = sharedLinkErrorMessage
				? `${sharedLinkErrorMessage} ${siteErrorMessage}`
				: siteErrorMessage
			return
		}

		const siteData = await siteResponse.json()
		const encodedDrivePath = driveRelativeFilePath.value
			.split('/')
			.map((segment) => encodeURIComponent(segment))
			.join('/')

		const metadataResponse = await fetch(
			`https://graph.microsoft.com/v1.0/sites/${siteData.id}/drive/root:/${encodedDrivePath}?$select=id,name,%40microsoft.graph.downloadUrl,webUrl`,
			{
				headers: {
					Authorization: `Bearer ${tokenResponse.accessToken}`
				}
			}
		)

		if (!metadataResponse.ok) {
			let graphErrorDetail = ''
			try {
				const errorPayload = await metadataResponse.json()
				graphErrorDetail = errorPayload?.error?.message || ''
			} catch {
				graphErrorDetail = ''
			}

			graphErrorMessage.value = graphErrorDetail
				? `Graph devolvio ${metadataResponse.status}: ${graphErrorDetail}`
				: `Graph devolvio ${metadataResponse.status} al resolver el enlace compartido.`
			return
		}

		const metadata = await metadataResponse.json()
		const contentResponse = await fetch(
			`https://graph.microsoft.com/v1.0/sites/${siteData.id}/drive/root:/${encodedDrivePath}:/content`,
			{
				headers: {
					Authorization: `Bearer ${tokenResponse.accessToken}`
				}
			}
		)

		if (contentResponse.ok) {
			revokeGraphBlobUrl()
			const videoBlob = await contentResponse.blob()
			graphBlobUrl.value = URL.createObjectURL(videoBlob)
			graphVideoUrl.value = graphBlobUrl.value
			currentSourceModeIndex.value = 0
			hasLoadError.value = false
			await nextTick()
			videoEl.value?.load()
			return
		}

		if (metadata['@microsoft.graph.downloadUrl']) {
			graphVideoUrl.value = metadata['@microsoft.graph.downloadUrl']
			currentSourceModeIndex.value = 0
			hasLoadError.value = false
			await nextTick()
			videoEl.value?.load()
			return
		}

		graphErrorMessage.value = `Graph encontro el archivo, pero no pudo descargar su contenido. Content devolvio ${contentResponse.status}.`
	} catch (error) {
		console.warn('No se pudo resolver URL de Graph para video:', error)
		graphErrorMessage.value = error?.message || 'No se pudo resolver el video con Microsoft Graph.'
	} finally {
		isResolvingGraph.value = false
	}
}

const buildUrl = (mode) => {
	if (mode === 'graph-path' && graphVideoUrl.value) {
		return graphVideoUrl.value
	}

	if (mode === 'direct-file') {
		return directFileUrl.value
	}

	if (mode === 'direct-download') {
		return directDownloadUrl.value
	}

	return sharePointFileUrl
}

const sourceModes = ['graph-path', 'direct-file', 'direct-download', 'shared-link']
const currentSourceModeIndex = ref(0)
const hasLoadError = ref(false)
const videoEl = ref(null)

const videoUrl = computed(() => buildUrl(sourceModes[currentSourceModeIndex.value]))

const tryNextSource = async () => {
	if (currentSourceModeIndex.value < sourceModes.length - 1) {
		currentSourceModeIndex.value += 1
		hasLoadError.value = false
		await nextTick()
		videoEl.value?.load()
		return
	}

	hasLoadError.value = true
}

onMounted(() => {
	resolveGraphVideoUrl()
})

onBeforeUnmount(() => {
	revokeGraphBlobUrl()
})
</script>

<template>
	<LayoutAuthenticated>
		<SectionMain>
			<SectionTitleLineWithButton :icon="mdiPlayCircleOutline" title="Video" main>
				<BaseButton
					v-if="hasLoadError"
					:icon="mdiOpenInNew"
					label="Abrir en nueva pestaña"
					color="info"
					:href="sharePointFileUrl"
					target="_blank"
				/>
			</SectionTitleLineWithButton>

			<CardBox>
				<p v-if="isResolvingGraph" class="mb-4 text-sm text-blue-600 dark:text-blue-400">
					Validando acceso al video con Microsoft Graph...
				</p>
				<p v-if="graphErrorMessage" class="mb-4 text-sm text-amber-700 dark:text-amber-400">
					{{ graphErrorMessage }}
				</p>
				<!-- <p v-if="!isAdminUser" class="mb-4 text-sm text-amber-700 dark:text-amber-400">
					Tu perfil es visualizador. Si el reproductor se ve en negro, la cuenta puede no tener acceso
					suficiente al MP4 en SharePoint.
				</p> -->
				<video
					ref="videoEl"
					class="w-full h-[70vh] min-h-[360px] rounded bg-black"
					controls
					playsinline
					preload="metadata"
					@error="tryNextSource"
				>
					<source :src="videoUrl" type="video/mp4" />
					Tu navegador no soporta la reproduccion de video MP4.
				</video>
				<p v-if="hasLoadError" class="mt-4 text-sm text-red-600 dark:text-red-400">
					No se pudo cargar el MP4 en esta pagina desde el origen {{ activeSourceLabel }}. Aunque el
					enlace sea publico, SharePoint puede bloquear la reproduccion embebida o la URL puede no ser
					un stream directo de video.
				</p>
				<p v-if="hasLoadError" class="mt-4 text-sm text-gray-500 dark:text-slate-400">
					Si no carga, abre el enlace en una pestaña nueva e inicia sesion en Microsoft 365.
				</p>
				<p v-if="!isAdminUser" class="mt-2 text-sm text-gray-500 dark:text-slate-400">
					Necesitas permiso de lectura del archivo para la misma cuenta con la que entras en esta app.
				</p>
			</CardBox>
		</SectionMain>
	</LayoutAuthenticated>
</template>
