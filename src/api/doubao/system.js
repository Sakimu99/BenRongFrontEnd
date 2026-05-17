import request from '@/utils/doubao-request'

export function getDoctor(accountId) {
  return request({
    url: '/api/doctor',
    method: 'get',
    params: accountId ? { accountId } : undefined
  })
}

export function bindSession(data) {
  return request({
    url: '/api/sessions/bind',
    method: 'post',
    data
  })
}
