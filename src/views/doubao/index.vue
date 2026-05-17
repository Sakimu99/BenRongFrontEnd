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
            <el-descriptions-item label="队列 Worker">{{ workerStatusText(doctor.workers && doctor.workers.queue) }}</el-descriptions-item>
            <el-descriptions-item label="轮询 Worker">{{ workerStatusText(doctor.workers && doctor.workers.polling) }}</el-descriptions-item>
          </el-descriptions>
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
              <el-button type="warning" size="mini" @click="handleRefreshAllQuota" v-hasPermi="['doubao:quota:refresh']">刷新全部额度</el-button>
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
                <el-button type="text" size="mini" @click="handleRefreshQuota(scope.row)" v-hasPermi="['doubao:quota:refresh']">刷新额度</el-button>
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
            <el-form-item label="指定账号">
              <el-select v-model="taskForm.accountId" clearable placeholder="留空则自动选号" style="width: 100%">
                <el-option v-for="item in accounts" :key="item.id" :label="item.label + ' (' + item.id + ')'" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="Prompt" prop="promptText">
              <el-input v-model="taskForm.promptText" type="textarea" :rows="5" placeholder="请输入图片或视频描述" />
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
                <el-button type="text" size="mini" @click.stop="handleLoadAssets(scope.row)">资产</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :span="24" class="card-box" v-if="currentTask">
        <el-card>
          <div slot="header" class="clearfix">
            <span><i class="el-icon-picture-outline"></i> 任务资产</span>
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
import { createAccount, listAccounts, checkAccountAuth, refreshAccountQuota, refreshAllAccountQuotas } from '@/api/doubao/account'
import { createTask, listTasks, pollTask, resetTask, dispatchTaskOnce, listTaskAssets, downloadTaskAssets, openTaskFile } from '@/api/doubao/task'
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
      accountForm: {
        accountId: undefined,
        label: undefined
      },
      taskForm: {
        mode: 'submit',
        taskType: 'video',
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
    handleRefreshQuota(row) {
      refreshAccountQuota(row.id).then(() => {
        this.$modal.msgSuccess('额度刷新成功')
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
      this.$refs.taskFormRef.validate(valid => {
        if (!valid) {
          return
        }
        createTask({
          mode: this.taskForm.mode,
          taskType: this.taskForm.taskType,
          accountId: this.taskForm.accountId,
          promptText: this.taskForm.promptText,
          submitPayload: {
            prompt: this.taskForm.promptText,
            type: this.taskForm.taskType
          }
        }).then(() => {
          this.$modal.msgSuccess('任务已提交')
          this.taskForm.promptText = ''
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
      if (status === 'queued') {
        return 'info'
      }
      return 'warning'
    },
    workerStatusText(worker) {
      if (!worker) {
        return 'unknown'
      }
      return worker.enabled ? `运行中 / ${worker.iterations || 0}` : '未启用'
    }
  }
}
</script>

<style scoped>
.card-box {
  margin-bottom: 12px;
}
</style>
