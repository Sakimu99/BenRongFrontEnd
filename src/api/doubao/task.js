import request from '@/utils/doubao-request'

export function listTasks(accountId) {
  return request({
    url: '/api/tasks',
    method: 'get',
    params: accountId ? { accountId } : undefined
  })
}

export function createTask(data) {
  return request({
    url: '/api/tasks',
    method: 'post',
    data
  })
}

export function uploadTaskImages(formData) {
  return request({
    url: '/api/uploads/images',
    method: 'post',
    data: formData
  })
}

export function adoptTask(data) {
  return request({
    url: '/api/tasks/adopt',
    method: 'post',
    data
  })
}

export function getTask(taskId) {
  return request({
    url: `/api/tasks/${taskId}`,
    method: 'get'
  })
}

export function pollTask(taskId) {
  return request({
    url: `/api/tasks/${taskId}/poll`,
    method: 'post'
  })
}

export function resetTask(taskId, data) {
  return request({
    url: `/api/tasks/${taskId}/reset`,
    method: 'post',
    data
  })
}

export function terminateTask(taskId, data) {
  return request({
    url: `/api/tasks/${taskId}/terminate`,
    method: 'post',
    data
  })
}

export function dispatchTaskOnce() {
  return request({
    url: '/api/tasks/dispatch-once',
    method: 'post'
  })
}

export function listTaskAssets(taskId) {
  return request({
    url: `/api/tasks/${taskId}/assets`,
    method: 'get'
  })
}

export function downloadTaskAssets(taskId) {
  return request({
    url: `/api/tasks/${taskId}/download`,
    method: 'post'
  })
}

export function openTaskFile(taskId, assetId) {
  return request({
    url: `/api/tasks/${taskId}/files/${assetId}`,
    method: 'get',
    responseType: 'blob'
  })
}

export function getTaskFileUrl(taskId, assetId) {
  const baseUrl = process.env.VUE_APP_DOUBAO_API || '/doubao-api'
  return `${baseUrl}/api/tasks/${taskId}/files/${assetId}`
}
