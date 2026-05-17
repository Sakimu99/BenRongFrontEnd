import axios from 'axios'
import { Message, MessageBox } from 'element-ui'
import store from '@/store'
import { getToken } from '@/utils/auth'
import { isRelogin } from '@/utils/request'

const service = axios.create({
  baseURL: process.env.VUE_APP_DOUBAO_API || '/doubao-api',
  timeout: 30000
})

service.interceptors.request.use(config => {
  const isToken = (config.headers || {}).isToken === false
  if (getToken() && !isToken) {
    config.headers['Authorization'] = 'Bearer ' + getToken()
  }
  return config
}, error => {
  return Promise.reject(error)
})

service.interceptors.response.use(response => {
  return response.data
}, error => {
  const status = error.response && error.response.status
  const message = error.response && error.response.data && error.response.data.message

  if (status === 401) {
    if (!isRelogin.show) {
      isRelogin.show = true
      MessageBox.confirm('DouBao 服务登录状态已过期，您可以继续留在该页面，或者重新登录', '系统提示', {
        confirmButtonText: '重新登录',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        isRelogin.show = false
        store.dispatch('LogOut').then(() => {
          location.href = '/index'
        })
      }).catch(() => {
        isRelogin.show = false
      })
    }
    return Promise.reject(new Error(message || '登录状态已过期'))
  }

  Message.error(message || error.message || 'DouBao 接口请求失败')
  return Promise.reject(error)
})

export default service
