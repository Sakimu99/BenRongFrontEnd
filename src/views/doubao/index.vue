<template>
  <div class="app-container">
    <el-row :gutter="12">
      <el-col :span="24" class="card-box">
        <el-card>
          <div slot="header" class="clearfix">
            <span><i class="el-icon-monitor"></i> DouBao 服务状态</span>
            <el-button style="float: right; padding: 3px 0" type="text" @click="loadDoctor">刷新</el-button>
          </div>
          <el-descriptions :column="4" border size="small" v-if="doctor">
            <el-descriptions-item label="服务端口">{{ doctor.env.port }}</el-descriptions-item>
            <el-descriptions-item label="数据目录">{{ doctor.dataDir }}</el-descriptions-item>
            <el-descriptions-item label="队列 Worker">{{ workerStatusText(doctor.queue) }}</el-descriptions-item>
            <el-descriptions-item label="轮询 Worker">{{ workerStatusText(doctor.polling) }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="doctor && doctor.pollingOverview" class="polling-overview">
            <div class="polling-overview__row">
              <el-tag size="mini" :type="pollingWorkerTagType(doctor.pollingOverview.worker)">
                {{ pollingWorkerSummary(doctor.pollingOverview.worker) }}
              </el-tag>
              <el-tag size="mini" type="warning" v-if="doctor.pollingOverview.counts && doctor.pollingOverview.counts.retrying">
                {{ doctor.pollingOverview.counts.retrying }} 个任务退避中
              </el-tag>
              <el-tag size="mini" type="success" v-if="doctor.pollingOverview.worker && doctor.pollingOverview.worker.lastRecoveredCount">
                最近恢复 {{ doctor.pollingOverview.worker.lastRecoveredCount }} 个
              </el-tag>
              <span class="polling-overview__hint" v-if="pollingLastMessage(doctor.pollingOverview)">
                {{ pollingLastMessage(doctor.pollingOverview) }}
              </span>
            </div>
            <div class="polling-overview__row polling-overview__row--counts">
              <el-tag size="mini">queued {{ pollingCount('queued') }}</el-tag>
              <el-tag size="mini" type="info">submitted {{ pollingCount('submitted') }}</el-tag>
              <el-tag size="mini" type="warning">polling {{ pollingCount('polling') }}</el-tag>
              <el-tag size="mini" type="success">completed {{ pollingCount('completed') }}</el-tag>
              <el-tag size="mini" type="danger">failed {{ pollingCount('failed') }}</el-tag>
            </div>
            <div class="polling-overview__row polling-overview__row--meta" v-if="pollingMetaText(doctor.pollingOverview)">
              {{ pollingMetaText(doctor.pollingOverview) }}
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="10" class="card-box">
        <el-card>
          <div slot="header" class="clearfix">
            <span><i class="el-icon-user"></i> 账号管理</span>
            <el-button style="float: right; padding: 3px 0" type="text" @click="loadAccounts">刷新</el-button>
          </div>

          <el-form ref="accountForm" :model="accountForm" :rules="accountRules" label-width="70px" size="small">
            <el-form-item label="账号 ID" prop="accountId">
              <el-input v-model="accountForm.accountId" placeholder="例如 account-01" />
            </el-form-item>
            <el-form-item label="标签" prop="label">
              <el-input v-model="accountForm.label" placeholder="例如 主账号" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" size="mini" @click="handleCreateAccount" v-hasPermi="['doubao:account:add']">新增账号</el-button>
              <el-button type="warning" size="mini" @click="handleRefreshAllQuota" v-hasPermi="['doubao:quota:refresh']">批量探测额度</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="accountLoading" :data="accounts" size="small" border style="margin-top: 12px">
            <el-table-column label="账号" prop="id" min-width="120" />
            <el-table-column label="标签" prop="label" min-width="100" />
            <el-table-column label="状态" min-width="100">
              <template slot-scope="scope">
                <el-tag size="mini" :type="accountStatusType(scope.row.status)">{{ scope.row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="视频额度" min-width="120">
              <template slot-scope="scope">
                <span>{{ quotaText(scope.row) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="180" fixed="right">
              <template slot-scope="scope">
                <el-button type="text" size="mini" @click="handleCheckAuth(scope.row)" v-hasPermi="['doubao:auth:check']">检查登录</el-button>
                <el-button type="text" size="mini" @click="handleStartVerification(scope.row)" v-if="scope.row.status === 'verification_required'">开始验证</el-button>
                <el-button type="text" size="mini" @click="handleRecoverVerification(scope.row)" v-if="scope.row.status === 'verification_required'">验证完成</el-button>
                <el-button type="text" size="mini" @click="handleSetQuota(scope.row)" v-hasPermi="['doubao:quota:update']">设置额度</el-button>
                <el-button type="text" size="mini" @click="handleRefreshQuota(scope.row)" v-hasPermi="['doubao:quota:refresh']">自动探测</el-button>
                <el-button type="text" size="mini" @click="handlePickAccount(scope.row)">选中</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="14" class="card-box">
        <el-card>
          <div slot="header" class="clearfix">
            <span><i class="el-icon-position"></i> 任务提交</span>
            <span style="float: right; color: #909399; font-size: 12px;">当前账号：{{ taskForm.accountId || '自动选号' }}</span>
          </div>

          <el-form ref="taskFormRef" :model="taskForm" :rules="taskRules" label-width="90px" size="small">
            <el-form-item label="提交模式" prop="mode">
              <el-radio-group v-model="taskForm.mode">
                <el-radio-button label="submit">立即提交</el-radio-button>
                <el-radio-button label="enqueue">加入队列</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="任务类型" prop="taskType">
              <el-radio-group v-model="taskForm.taskType">
                <el-radio-button label="image">图片</el-radio-button>
                <el-radio-button label="video">视频</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="视频时长" v-if="taskForm.taskType === 'video'">
              <el-radio-group v-model="taskForm.videoDurationSec">
                <el-radio-button :label="5">5 秒</el-radio-button>
                <el-radio-button :label="10">10 秒</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="指定账号">
              <el-select v-model="taskForm.accountId" clearable placeholder="留空则自动选号" style="width: 100%">
                <el-option v-for="item in accounts" :key="item.id" :label="item.label + ' (' + item.id + ')'" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="Prompt" prop="promptText">
              <el-input v-model="taskForm.promptText" type="textarea" :rows="5" placeholder="请输入图片或视频描述" />
            </el-form-item>
            <el-form-item label="参考图" v-if="taskForm.taskType === 'image'">
              <el-upload
                action="#"
                multiple
                :limit="4"
                list-type="text"
                :auto-upload="false"
                :http-request="noopUploadRequest"
                :file-list="referenceImageFiles"
                :on-change="handleReferenceImageChange"
                :on-remove="handleReferenceImageRemove">
                <el-button size="mini">选择图片</el-button>
                <div slot="tip" class="el-upload__tip">最多 4 张，仅支持图片文件。</div>
              </el-upload>
            </el-form-item>
            <el-form-item label="基底图" v-if="taskForm.taskType === 'video'">
              <el-upload
                action="#"
                :limit="1"
                list-type="text"
                :auto-upload="false"
                :http-request="noopUploadRequest"
                :file-list="baseImageFiles"
                :on-change="handleBaseImageChange"
                :on-remove="handleBaseImageRemove">
                <el-button size="mini">选择图片</el-button>
                <div slot="tip" class="el-upload__tip">视频任务可选 1 张基底图。</div>
              </el-upload>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" size="mini" @click="handleCreateTask" v-hasPermi="['doubao:task:submit']">提交任务</el-button>
              <el-button type="success" size="mini" @click="handleDispatchOnce" v-hasPermi="['doubao:task:submit']">派发一次</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="24" class="card-box">
        <el-card>
          <div slot="header" class="clearfix">
            <span><i class="el-icon-tickets"></i> 任务列表</span>
            <el-button style="float: right; padding: 3px 0" type="text" @click="loadTasks">刷新</el-button>
          </div>
          <el-table v-loading="taskLoading" :data="tasks" size="small" border @row-click="handleSelectTask">
            <el-table-column label="任务 ID" prop="id" width="80" />
            <el-table-column label="类型" prop="taskType" width="80" />
            <el-table-column label="账号" prop="accountId" min-width="100" />
            <el-table-column label="状态" width="110">
              <template slot-scope="scope">
                <el-tag size="mini" :type="taskStatusType(scope.row.status)">{{ scope.row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Prompt" prop="promptText" min-width="260" show-overflow-tooltip />
            <el-table-column label="更新时间" prop="updatedAt" min-width="180" />
            <el-table-column label="错误信息" prop="errorMessage" min-width="220" show-overflow-tooltip />
            <el-table-column label="操作" fixed="right" min-width="240">
              <template slot-scope="scope">
                <el-button type="text" size="mini" @click.stop="handlePollTask(scope.row)" v-hasPermi="['doubao:task:poll']">轮询</el-button>
                <el-button type="text" size="mini" @click.stop="handleDownloadTask(scope.row)" v-hasPermi="['doubao:task:download']">下载</el-button>
                <el-button type="text" size="mini" @click.stop="handleResetTask(scope.row)">重置</el-button>
                <el-button type="text" size="mini" @click.stop="handleTerminateTask(scope.row)" v-if="canTerminateTask(scope.row)" v-hasPermi="['doubao:task:terminate']">终结</el-button>
                <el-tooltip content="查看该任务已解析出的结果资源，不会重新轮询或重新生成" placement="top">
                  <el-button type="text" size="mini" @click.stop="handleLoadAssets(scope.row)">查看资产</el-button>
                </el-tooltip>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="24" class="card-box" v-if="currentTask">
        <el-card>
          <div slot="header" class="clearfix">
            <span><i class="el-icon-picture-outline"></i> 任务资产</span>
            <span style="margin-left: 8px; color: #909399; font-size: 12px;">仅展示已解析出的结果资源，不会触发重新生成</span>
            <span style="float: right; color: #909399; font-size: 12px;">任务 #{{ currentTask.id }}</span>
          </div>
          <el-table :data="assets" size="small" border>
            <el-table-column label="资产 ID" prop="id" width="80" />
            <el-table-column label="类型" prop="assetType" width="80" />
            <el-table-column label="下载状态" prop="downloadStatus" width="100" />
            <el-table-column label="预览地址" prop="previewUrl" min-width="240" show-overflow-tooltip />
            <el-table-column label="本地文件" prop="localPath" min-width="240" show-overflow-tooltip />
            <el-table-column label="操作" width="120">
              <template slot-scope="scope">
                <el-button type="text" size="mini" :disabled="scope.row.downloadStatus !== 'downloaded'" @click="handleOpenFile(scope.row)">打开文件</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { createAccount, listAccounts, checkAccountAuth, startAccountVerification, recoverAccountVerification, setAccountQuota, refreshAccountQuota, refreshAllAccountQuotas } from '@/api/doubao/account'
import { createTask, listTasks, pollTask, resetTask, terminateTask, dispatchTaskOnce, listTaskAssets, downloadTaskAssets, openTaskFile, uploadTaskImages } from '@/api/doubao/task'
import { getDoctor } from '@/api/doubao/system'

export default {
  name: 'DoubaoConsole',
  data() {
    return {
      doctor: null,
      accountLoading: false,
      taskLoading: false,
      accounts: [],
      tasks: [],
      assets: [],
      currentTask: null,
      referenceImageFiles: [],
      baseImageFiles: [],
      accountForm: {
        accountId: undefined,
        label: undefined
      },
      quotaForm: {
        accountId: undefined,
        total: 10,
        remaining: 10,
        status: 'available'
      },
      taskForm: {
        mode: 'submit',
        taskType: 'video',
        videoDurationSec: 5,
        accountId: undefined,
        promptText: ''
      },
      accountRules: {
        accountId: [{ required: true, message: '账号 ID 不能为空', trigger: 'blur' }]
      },
      taskRules: {
        promptText: [{ required: true, message: 'Prompt 不能为空', trigger: 'blur' }],
        taskType: [{ required: true, message: '任务类型不能为空', trigger: 'change' }],
        mode: [{ required: true, message: '提交模式不能为空', trigger: 'change' }]
      }
    }
  },
  created() {
    this.loadDoctor()
    this.loadAccounts()
    this.loadTasks()
  },
  methods: {
    loadDoctor() {
      getDoctor().then(res => {
        this.doctor = res
      })
    },
    loadAccounts() {
      this.accountLoading = true
      listAccounts().then(res => {
        this.accounts = (res && res.data) || []
      }).finally(() => {
        this.accountLoading = false
      })
    },
    loadTasks() {
      this.taskLoading = true
      listTasks().then(res => {
        this.tasks = (res && res.data) || []
      }).finally(() => {
        this.taskLoading = false
      })
    },
    handleCreateAccount() {
      this.$refs.accountForm.validate(valid => {
        if (!valid) {
          return
        }
        createAccount(this.accountForm).then(() => {
          this.$modal.msgSuccess('账号创建成功')
          this.accountForm.accountId = undefined
          this.accountForm.label = undefined
          this.loadAccounts()
        })
      })
    },
    handleCheckAuth(row) {
      checkAccountAuth(row.id).then(res => {
        const data = res.data || {}
        this.$modal.msgSuccess(data.valid ? '登录态有效' : '登录态已失效')
        this.loadAccounts()
      })
    },
    handleStartVerification(row) {
      startAccountVerification(row.id).then(() => {
        this.$modal.msgSuccess('验证窗口已打开，请在浏览器中完成人工验证')
        this.loadAccounts()
      })
    },
    handleRecoverVerification(row) {
      recoverAccountVerification(row.id).then(() => {
        this.$modal.msgSuccess('账号已恢复并重新加入号池')
        this.loadAccounts()
      })
    },
    handleSetQuota(row) {
      this.quotaForm.accountId = row.id
      this.quotaForm.total = row.videoQuotaTotal !== undefined ? row.videoQuotaTotal : 10
      this.quotaForm.remaining = row.videoQuotaRemaining !== undefined ? row.videoQuotaRemaining : this.quotaForm.total
      this.quotaForm.status = row.videoQuotaStatus || (this.quotaForm.remaining > 0 ? 'available' : 'exhausted')
      this.$prompt('请输入总额度和剩余额度，格式为 total,remaining，例如 10,6', '设置额度', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: `${this.quotaForm.total},${this.quotaForm.remaining}`,
        inputPattern: /^\s*\d+\s*,\s*\d+\s*$/,
        inputErrorMessage: '请输入正确格式，例如 10,6'
      }).then(({ value }) => {
        const [totalText, remainingText] = value.split(',')
        const total = Number(totalText.trim())
        const remaining = Number(remainingText.trim())
        const status = remaining > 0 ? 'available' : 'exhausted'
        return setAccountQuota(row.id, { total, remaining, status })
      }).then(() => {
        this.$modal.msgSuccess('额度设置成功')
        this.loadAccounts()
      }).catch(() => {})
    },
    handleRefreshQuota(row) {
      refreshAccountQuota(row.id).then(() => {
        this.$modal.msgSuccess('额度自动探测成功')
        this.loadAccounts()
      })
    },
    handleRefreshAllQuota() {
      refreshAllAccountQuotas().then(() => {
        this.$modal.msgSuccess('全部账号额度已刷新')
        this.loadAccounts()
      })
    },
    handlePickAccount(row) {
      this.taskForm.accountId = row.id
      this.$modal.msgSuccess('已选中账号 ' + row.id)
    },
    handleCreateTask() {
      this.$refs.taskFormRef.validate(async valid => {
        if (!valid) {
          return
        }
        const uploaded = await this.uploadTaskMaterials()
        createTask({
          mode: this.taskForm.mode,
          taskType: this.taskForm.taskType,
          accountId: this.taskForm.accountId,
          promptText: this.taskForm.promptText,
          submitPayload: {
            prompt: this.taskForm.promptText,
            type: this.taskForm.taskType,
            referenceImages: this.taskForm.taskType === 'image' ? uploaded.referenceImages : undefined,
            baseImage: this.taskForm.taskType === 'video' ? uploaded.baseImage : undefined,
            videoDurationSec: this.taskForm.taskType === 'video' ? this.taskForm.videoDurationSec : undefined
          }
        }).then(() => {
          this.$modal.msgSuccess('任务已提交')
          this.taskForm.promptText = ''
          this.referenceImageFiles = []
          this.baseImageFiles = []
          this.loadTasks()
        })
      })
    },
    handleDispatchOnce() {
      dispatchTaskOnce().then(() => {
        this.$modal.msgSuccess('已执行一次队列派发')
        this.loadTasks()
      })
    },
    handlePollTask(row) {
      pollTask(row.id).then(() => {
        this.$modal.msgSuccess('任务轮询完成')
        this.loadTasks()
        if (this.currentTask && this.currentTask.id === row.id) {
          this.handleLoadAssets(row)
        }
      })
    },
    handleDownloadTask(row) {
      downloadTaskAssets(row.id).then(() => {
        this.$modal.msgSuccess('任务资源下载完成')
        this.handleLoadAssets(row)
      })
    },
    handleResetTask(row) {
      this.$modal.confirm('确认将该任务重置为 queued 吗？').then(() => {
        resetTask(row.id, { status: 'queued' }).then(() => {
          this.$modal.msgSuccess('任务已重置')
          this.loadTasks()
        })
      }).catch(() => {})
    },
    handleTerminateTask(row) {
      this.$prompt('请输入终结原因', '终结任务', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /\S+/,
        inputErrorMessage: '终结原因不能为空'
      }).then(({ value }) => {
        return terminateTask(row.id, { reason: value.trim() })
      }).then(() => {
        this.$modal.msgSuccess('任务已终结')
        this.loadTasks()
        if (this.currentTask && this.currentTask.id === row.id) {
          this.handleLoadAssets(row)
        }
      }).catch(() => {})
    },
    handleLoadAssets(row) {
      this.currentTask = row
      listTaskAssets(row.id).then(res => {
        this.assets = (res && res.data) || []
      })
    },
    handleSelectTask(row) {
      this.handleLoadAssets(row)
    },
    handleOpenFile(row) {
      if (!this.currentTask) {
        return
      }
      openTaskFile(this.currentTask.id, row.id).then(blob => {
        const fileUrl = window.URL.createObjectURL(blob)
        window.open(fileUrl, '_blank')
        window.setTimeout(() => {
          window.URL.revokeObjectURL(fileUrl)
        }, 60000)
      })
    },
    async uploadTaskMaterials() {
      if (this.taskForm.taskType === 'image') {
        const tokens = await this.uploadFiles(this.referenceImageFiles, 'referenceImages')
        return { referenceImages: tokens, baseImage: undefined }
      }
      const tokens = await this.uploadFiles(this.baseImageFiles, 'baseImage')
      return { referenceImages: undefined, baseImage: tokens[0] }
    },
    async uploadFiles(fileList, fieldName) {
      if (!fileList || !fileList.length) {
        return []
      }
      const formData = new FormData()
      fileList.forEach(file => {
        const rawFile = file.raw || file
        formData.append(fieldName, rawFile, rawFile.name)
      })
      const res = await uploadTaskImages(formData)
      return ((res && res.data && res.data.files) || []).map(item => item.token)
    },
    noopUploadRequest() {
    },
    handleReferenceImageChange(file, fileList) {
      this.referenceImageFiles = fileList.slice(-4)
    },
    handleReferenceImageRemove(file, fileList) {
      this.referenceImageFiles = fileList
    },
    handleBaseImageChange(file, fileList) {
      this.baseImageFiles = fileList.slice(-1)
    },
    handleBaseImageRemove(file, fileList) {
      this.baseImageFiles = fileList
    },
    quotaText(row) {
      const status = row.videoQuotaStatus || 'unknown'
      const remaining = row.videoQuotaRemaining
      const total = row.videoQuotaTotal
      if (remaining === undefined && total === undefined) {
        return status
      }
      return `${status} (${remaining || 0}/${total || 0})`
    },
    accountStatusType(status) {
      if (status === 'active') {
        return 'success'
      }
      if (status === 'verification_required') {
        return 'danger'
      }
      if (status === 'relogin_required') {
        return 'warning'
      }
      return 'info'
    },
    taskStatusType(status) {
      if (status === 'completed') {
        return 'success'
      }
      if (status === 'failed') {
        return 'danger'
      }
      if (status === 'terminated') {
        return 'info'
      }
      if (status === 'queued') {
        return 'info'
      }
      return 'warning'
    },
    canTerminateTask(row) {
      return ['queued', 'dispatching', 'submitting', 'submitted', 'polling'].includes(row.status)
    },
    workerStatusText(worker) {
      if (!worker) {
        return 'unknown'
      }
      return worker.enabled ? `运行中 / ${worker.iterations || 0}` : '未启用'
    },
    pollingCount(status) {
      const counts = this.doctor && this.doctor.pollingOverview && this.doctor.pollingOverview.counts
      return (counts && counts[status]) || 0
    },
    pollingWorkerTagType(worker) {
      if (!worker || !worker.enabled) {
        return 'info'
      }
      if (worker.lastError) {
        return 'danger'
      }
      if (worker.lastRecoveredCount) {
        return 'warning'
      }
      return 'success'
    },
    pollingWorkerSummary(worker) {
      if (!worker || !worker.enabled) {
        return '轮询未启用'
      }
      if (worker.lastError) {
        return '轮询最近有错误'
      }
      if (worker.running) {
        return '轮询运行中'
      }
      return '轮询空闲中'
    },
    pollingLastMessage(overview) {
      const worker = overview && overview.worker
      if (!worker) {
        return ''
      }
      if (worker.lastError) {
        return `最近错误：${worker.lastError}`
      }
      if (worker.lastRecoveredAt) {
        return `最近自动恢复：${this.formatDateTime(worker.lastRecoveredAt)}`
      }
      if (worker.lastSuccessAt) {
        return `最近正常轮询：${this.formatDateTime(worker.lastSuccessAt)}`
      }
      return ''
    },
    pollingMetaText(overview) {
      if (!overview) {
        return ''
      }
      const texts = []
      const retry = overview.retry || {}
      const worker = overview.worker || {}
      if (retry.nearestRetryAt) {
        texts.push(`下一次重试：${this.formatDateTime(retry.nearestRetryAt)}`)
      }
      if (worker.lastRecoveredAt) {
        texts.push(`最近恢复：${this.formatDateTime(worker.lastRecoveredAt)}`)
      }
      if (worker.recoveredTotal) {
        texts.push(`累计恢复 ${worker.recoveredTotal} 次`)
      }
      return texts.join(' ｜ ')
    },
    formatDateTime(value) {
      if (!value) {
        return '--'
      }
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) {
        return value
      }
      const pad = num => String(num).padStart(2, '0')
      return `${date.getMonth() + 1}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    }
  }
}
</script>

<style scoped>
.card-box {
  margin-bottom: 12px;
}

.polling-overview {
  margin-top: 12px;
  padding: 10px 12px;
  background: #f8f9fb;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.polling-overview__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.polling-overview__row + .polling-overview__row {
  margin-top: 8px;
}

.polling-overview__row--meta,
.polling-overview__hint {
  color: #909399;
  font-size: 12px;
}
</style>
