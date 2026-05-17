import request from '@/utils/doubao-request'

export function listAccounts() {
  return request({
    url: '/api/accounts',
    method: 'get'
  })
}

export function createAccount(data) {
  return request({
    url: '/api/accounts',
    method: 'post',
    data
  })
}

export function getAccount(accountId) {
  return request({
    url: `/api/accounts/${accountId}`,
    method: 'get'
  })
}

export function checkAccountAuth(accountId) {
  return request({
    url: `/api/accounts/${accountId}/auth/check`,
    method: 'get'
  })
}

export function startAccountVerification(accountId) {
  return request({
    url: `/api/accounts/${accountId}/verification/start`,
    method: 'post'
  })
}

export function recoverAccountVerification(accountId) {
  return request({
    url: `/api/accounts/${accountId}/verification/recover`,
    method: 'post'
  })
}

export function refreshAccountQuota(accountId) {
  return request({
    url: `/api/accounts/${accountId}/quota/refresh`,
    method: 'post'
  })
}

export function refreshAllAccountQuotas() {
  return request({
    url: '/api/accounts/quota/refresh-all',
    method: 'post'
  })
}
