<template>
  <view class="page-container">
    <view class="page-header">
      <view class="page-header__row">
        <view>
          <text class="page-title">理财计划</text>
          <text class="page-subtitle">让收益稳步发生</text>
        </view>
        <text v-if="sortedPlanList.length > 0" class="page-counter">
          共 {{ sortedPlanList.length }} 个计划
        </text>
      </view>
    </view>

    <view class="content-container">
      <view v-if="loading && sortedPlanList.length === 0" class="empty-state">
        <text class="empty-state__title">加载中…</text>
      </view>
      <view v-else-if="sortedPlanList.length === 0" class="empty-state">
        <text class="empty-state__title">还没有任何理财计划</text>
        <text class="empty-state__hint">点击底部「新建计划」开始</text>
      </view>

      <view v-else class="plan-list">
        <view
          v-for="plan in sortedPlanList"
          :key="plan.planId"
          class="plan-card"
          :class="{
            'plan-card--expanded': expandedPlanId === plan.planId,
            'plan-card--archived': !isPlanEditable(plan),
          }"
        >
          <view class="plan-card__head" @click="togglePlan(plan.planId)">
            <view class="plan-card__head-row">
              <view class="plan-card__head-left">
                <text class="plan-card__name">{{ plan.planName }}</text>
                <text class="plan-card__meta">{{ resolveDateRangeLabel(plan) }}</text>
              </view>
              <view class="plan-card__head-right">
                <text class="plan-card__status" :class="resolveStatusClass(plan)">
                  {{ resolveStatusLabel(plan) }}
                </text>
                <text class="plan-card__caret">{{ expandedPlanId === plan.planId ? '▾' : '▸' }}</text>
              </view>
            </view>

            <view v-if="planDetails[plan.planId]" class="plan-card__progress">
              <view class="progress-bar">
                <view
                  class="progress-bar__fill"
                  :class="profitToneClass(planDetails[plan.planId].summary?.actualProfit)"
                  :style="{ width: progressBarWidth(planDetails[plan.planId].summary?.completionRate) }"
                />
              </view>
              <text class="progress-bar__legend">
                <text :class="profitToneClass(planDetails[plan.planId].summary?.actualProfit)">
                  ¥{{ formatProfit(planDetails[plan.planId].summary?.actualProfit) }}
                </text>
                <text class="muted"> / ¥{{ formatNumber(planDetails[plan.planId].summary?.targetProfit) }} ·
                  {{ formatPercent(planDetails[plan.planId].summary?.completionRate) }}</text>
              </text>
            </view>
          </view>

          <view v-if="expandedPlanId === plan.planId" class="plan-card__body">
            <view v-if="!planDetails[plan.planId]" class="loading-text">详情加载中…</view>

            <view v-else>
              <view class="metric-row">
                <view class="metric">
                  <text class="metric__label">目标盈利</text>
                  <text class="metric__value">¥{{ formatNumber(planDetails[plan.planId].summary?.targetProfit) }}</text>
                </view>
                <view class="metric">
                  <text class="metric__label">已计划</text>
                  <text class="metric__value">¥{{ formatNumber(planDetails[plan.planId].summary?.plannedProfit) }}</text>
                  <text class="metric__sub">完成 {{ formatPercent(planDetails[plan.planId].summary?.plannedCompletionRate) }}</text>
                </view>
                <view class="metric">
                  <text class="metric__label">已实现</text>
                  <text
                    class="metric__value"
                    :class="profitToneClass(planDetails[plan.planId].summary?.actualProfit)"
                  >¥{{ formatProfit(planDetails[plan.planId].summary?.actualProfit) }}</text>
                  <text class="metric__sub">完成 {{ formatPercent(planDetails[plan.planId].summary?.completionRate) }}</text>
                </view>
              </view>

              <view
                v-if="resolvePlanMarketBreakdowns(plan.planId).length > 0"
                class="breakdown-row"
              >
                <view
                  v-for="b in resolvePlanMarketBreakdowns(plan.planId)"
                  :key="`bd-${plan.planId}-${b.market}`"
                  class="breakdown-chip"
                >
                  <text class="breakdown-chip__currency">{{ b.currency }}</text>
                  <text class="breakdown-chip__amount">
                    <text :class="profitToneClass(b.actualNative)">{{ formatProfit(b.actualNative) }}</text>
                    <text class="muted"> / {{ formatNumber(b.plannedNative) }}</text>
                  </text>
                  <text class="breakdown-chip__rate">×{{ b.rate }}</text>
                </view>
              </view>

              <view class="plan-actions">
                <button
                  v-if="isPlanEditable(plan)"
                  class="btn btn--primary"
                  @click.stop="openAddAssetSheet(plan.planId)"
                >+ 标的</button>
                <button
                  v-if="isPlanEditable(plan)"
                  class="btn btn--ghost"
                  @click.stop="openEditPlanModal(plan.planId)"
                >编辑计划</button>
                <button
                  class="btn btn--ghost"
                  @click.stop="handleArchivePlan(plan)"
                >{{ plan.status === 'ARCHIVED' ? '恢复' : '归档' }}</button>
              </view>

              <view v-if="planDetails[plan.planId].assets.length === 0" class="empty-mini">
                暂无标的，点击「+ 标的」添加
              </view>

              <view
                v-for="asset in planDetails[plan.planId].assets"
                :key="asset.assetId"
                class="asset-card"
              >
                <view class="asset-card__head">
                  <view class="asset-card__head-left">
                    <view class="asset-card__title-row">
                      <text
                        class="market-chip"
                        :class="resolveMarketChipClass(asset.market)"
                      >{{ resolveMarketLabel(asset.market) }}</text>
                      <text class="asset-card__name">{{ asset.stockName }}</text>
                    </view>
                    <text class="asset-card__meta">
                      <text class="currency-tag">{{ resolveMarketCurrencyCode(asset.market) }}</text>
                      目标 {{ formatNumber(asset.targetProfit) }}
                      · 已计划 {{ formatNumber(resolveAssetPlannedProfitRaw(plan.planId, asset.assetId)) }}
                      · 已实现
                      <text
                        :class="profitToneClass(resolveAssetActualProfitRaw(plan.planId, asset.assetId))"
                      >{{ formatProfit(resolveAssetActualProfitRaw(plan.planId, asset.assetId)) }}</text>
                    </text>
                    <text class="asset-card__rate">
                      计划 {{ formatPercent(resolveAssetPlannedRate(plan.planId, asset.assetId)) }}
                      · 实际 {{ formatPercent(resolveAssetActualRate(plan.planId, asset.assetId)) }}
                    </text>
                  </view>
                  <button
                    v-if="isPlanEditable(plan)"
                    class="btn btn--mini btn--primary"
                    @click.stop="openAddBatchSheet(plan.planId, asset.assetId)"
                  >+ 批次</button>
                </view>

                <view v-if="batchesByAsset(plan.planId, asset.assetId).length === 0" class="empty-mini empty-mini--sub">
                  暂无批次
                </view>

                <view
                  v-for="batch in batchesByAsset(plan.planId, asset.assetId)"
                  :key="batch.batchId"
                  class="batch-row"
                >
                  <view class="batch-row__main">
                    <view class="batch-row__title-line">
                      <text class="batch-row__name">{{ resolveBatchTitle(batch) }}</text>
                      <text
                        class="status-badge"
                        :class="resolveStageToneClass(batch.stageStatus)"
                      >{{ resolveStageLabel(batch.stageStatus) }}</text>
                    </view>
                    <text class="batch-row__summary">
                      计划 数量 {{ batch.quantity }} · {{ formatNumber(batch.planBuyPrice) }} → {{ formatNumber(batch.planSellPrice) }}
                    </text>

                    <view class="bstat-grid">
                      <view class="bstat">
                        <text class="bstat__label">目标收益</text>
                        <text class="bstat__value">{{ formatNumber(statTargetProfit(batch)) }}</text>
                      </view>
                      <view class="bstat">
                        <text class="bstat__label">累计已实现</text>
                        <text class="bstat__value" :class="profitToneClass(statTotalRealized(batch))">{{ formatProfit(statTotalRealized(batch)) }}</text>
                      </view>
                      <view class="bstat">
                        <text class="bstat__label">正股已实现</text>
                        <text class="bstat__value" :class="profitToneClass(statStockRealized(batch))">{{ formatProfit(statStockRealized(batch)) }}</text>
                      </view>
                      <view class="bstat">
                        <text class="bstat__label">期权已实现</text>
                        <text class="bstat__value" :class="profitToneClass(statOptionRealized(batch))">{{ formatProfit(statOptionRealized(batch)) }}</text>
                      </view>
                      <view class="bstat">
                        <text class="bstat__label">正股数量</text>
                        <text class="bstat__value">{{ statStockQty(batch) }}</text>
                      </view>
                      <view class="bstat">
                        <text class="bstat__label">正股成本价</text>
                        <text class="bstat__value">{{ formatNumber(statStockCostPrice(batch)) }}</text>
                      </view>
                    </view>

                    <view v-if="statOptionKeys(batch).length > 0" class="optkey-list">
                      <view
                        v-for="k in statOptionKeys(batch)"
                        :key="optionKeyId(k)"
                        class="optkey-row"
                      >
                        <view class="optkey-row__info">
                          <text class="optkey-row__title">
                            <text
                              class="opt-chip"
                              :class="k.optionType === 'CALL' ? 'opt-chip--call' : 'opt-chip--put'"
                            >{{ k.optionType }}</text>
                            {{ formatNumber(k.strikePrice) }} · 到期 {{ k.expirationDate }}
                          </text>
                          <text class="optkey-row__meta">
                            数量 {{ k.netQuantity }} · 成本 {{ formatNumber(k.costAmount) }} · 已实现
                            <text :class="profitToneClass(k.realizedProfit)">{{ formatProfit(k.realizedProfit) }}</text>
                          </text>
                        </view>
                        <view v-if="isPlanEditable(plan)" class="optkey-row__actions">
                          <template v-if="Number(k.netQuantity) > 0">
                            <button class="btn btn--mini btn--danger" @click.stop="openOptionSellSheet(plan.planId, batch.batchId, k)">卖出</button>
                            <button class="btn btn--mini btn--ghost" @click.stop="handleExercise(plan.planId, batch.batchId, k, 'EXERCISE')">行权</button>
                          </template>
                          <template v-else-if="Number(k.netQuantity) < 0">
                            <button class="btn btn--mini btn--success" @click.stop="openOptionBuySheet(plan.planId, batch.batchId, k)">买入</button>
                            <button class="btn btn--mini btn--ghost" @click.stop="handleExercise(plan.planId, batch.batchId, k, 'ASSIGN')">被行权</button>
                          </template>
                        </view>
                      </view>
                    </view>

                    <view class="ops-toggle" @click.stop="toggleOps(batch.batchId)">
                      <text class="ops-toggle__text">
                        {{ isOpsExpanded(batch.batchId) ? '收起操作记录' : '操作记录 (' + batchOperations(batch.batchId).length + ')' }}
                      </text>
                    </view>
                    <view v-if="isOpsExpanded(batch.batchId) && batchOperations(batch.batchId).length > 0" class="op-grid">
                      <view
                        v-for="op in batchOperations(batch.batchId)"
                        :key="op.operationId"
                        class="op-cell"
                        :class="op.operationType === 'BUY' ? 'op-cell--buy' : 'op-cell--sell'"
                      >
                        <text class="op-cell__type">{{ opLabel(op) }}</text>
                        <text class="op-cell__line">
                          {{ op.tradeDate }} · {{ formatNumber(op.price) }} × {{ op.quantity }}<text
                            v-if="op.instrument === 'OPTION' && op.strikePrice"
                          > · 行权价 {{ formatNumber(op.strikePrice) }}</text><text
                            v-if="op.fee && Number(op.fee) > 0"
                          > · 费 {{ formatNumber(op.fee) }}</text>
                        </text>
                      </view>
                    </view>
                  </view>

                  <view v-if="isPlanEditable(plan)" class="batch-row__actions">
                    <button
                      class="btn btn--mini btn--ghost"
                      @click.stop="openEditBatchSheet(plan.planId, batch)"
                    >编辑</button>
                    <button
                      class="btn btn--mini btn--success"
                      @click.stop="openBuySheet(plan.planId, batch.batchId)"
                    >买入</button>
                    <button
                      class="btn btn--mini btn--danger"
                      @click.stop="openSellSheet(plan.planId, batch.batchId)"
                    >卖出</button>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- ===== 新建 / 编辑 计划 ===== -->
    <view v-if="showPlanModal" class="sheet-mask" @click="closePlanModal">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-grabber"></view>
        <view class="sheet-header">
          <text class="sheet-title">{{ planModalMode === 'create' ? '新建理财计划' : '编辑理财计划' }}</text>
          <text class="sheet-close" @click="closePlanModal">×</text>
        </view>
        <view class="sheet-body">
          <view class="field">
            <text class="field__label">计划名称</text>
            <input class="field__input" v-model="planFormState.planName" placeholder="例如：2026 家庭计划" />
          </view>
          <view class="field">
            <text class="field__label">时间范围</text>
            <picker :range="timeRangeOptions" range-key="label" @change="onPlanTimeRangeChange">
              <view class="field__picker">
                <text>{{ resolveTimeRangeLabel(planFormState.timeRangeType) }}</text>
                <text class="field__picker-arrow">▾</text>
              </view>
            </picker>
          </view>
          <view v-if="planFormState.timeRangeType === 'YEAR'" class="field">
            <text class="field__label">年度</text>
            <input class="field__input" v-model="planFormState.fiscalYear" type="number" placeholder="例如 2026" />
          </view>
          <view v-else class="field-row">
            <view class="field">
              <text class="field__label">开始日期</text>
              <DatePicker
                v-model="planFormState.startDate"
                mode="date"
                placeholder="请选择"
                title="选择开始日期"
              />
            </view>
            <view class="field">
              <text class="field__label">结束日期</text>
              <DatePicker
                v-model="planFormState.endDate"
                mode="date"
                placeholder="请选择"
                title="选择结束日期"
              />
            </view>
          </view>
          <view class="field">
            <text class="field__label">目标盈利</text>
            <input class="field__input" v-model="planFormState.targetProfit" type="number" placeholder="0.00" />
          </view>
          <view class="field">
            <text class="field__label">备注</text>
            <textarea class="field__textarea" v-model="planFormState.remark" placeholder="可选" />
          </view>
        </view>
        <view class="sheet-actions">
          <button class="btn btn--ghost btn--lg" @click="closePlanModal">取消</button>
          <button class="btn btn--primary btn--lg" @click="handleSubmitPlan">保存</button>
        </view>
      </view>
    </view>

    <!-- ===== 新增标的 ===== -->
    <view v-if="showAddAssetFormFor" class="sheet-mask" @click="closeAddAssetForm">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-grabber"></view>
        <view class="sheet-header">
          <text class="sheet-title">新增标的</text>
          <text class="sheet-close" @click="closeAddAssetForm">×</text>
        </view>
        <view class="sheet-body">
          <view class="field">
            <text class="field__label">股票名称</text>
            <input class="field__input" v-model="newAssetForm.stockName" placeholder="例如：腾讯控股" />
          </view>
          <view class="field">
            <text class="field__label">所属市场</text>
            <picker :range="marketOptions" range-key="label" @change="onNewAssetMarketChange">
              <view class="field__picker">
                <text>{{ resolveMarketLabel(newAssetForm.market) }}</text>
                <text class="field__picker-arrow">▾</text>
              </view>
            </picker>
          </view>
          <view class="field">
            <text class="field__label">目标盈利</text>
            <input class="field__input" v-model="newAssetForm.targetProfit" type="number" placeholder="0.00" />
          </view>
        </view>
        <view class="sheet-actions">
          <button class="btn btn--ghost btn--lg" @click="closeAddAssetForm">取消</button>
          <button
            class="btn btn--primary btn--lg"
            @click="handleSubmitAddAsset(showAddAssetFormFor || '')"
          >保存</button>
        </view>
      </view>
    </view>

    <!-- ===== 新增批次 ===== -->
    <view v-if="showAddBatchFormFor" class="sheet-mask" @click="closeAddBatchForm">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-grabber"></view>
        <view class="sheet-header">
          <text class="sheet-title">新增正股批次</text>
          <text class="sheet-close" @click="closeAddBatchForm">×</text>
        </view>
        <view class="sheet-body">
          <text class="sheet-hint">批次对应一只正股；期权请在批次的「买入/卖出」里作为操作记录。</text>
          <view class="field">
            <text class="field__label">数量</text>
            <input class="field__input" v-model="newBatchForm.quantity" type="number" placeholder="数量" />
          </view>
          <view class="field-row">
            <view class="field">
              <text class="field__label">预期买入价</text>
              <input class="field__input" v-model="newBatchForm.planBuyPrice" type="digit" placeholder="0.00" />
            </view>
            <view class="field">
              <text class="field__label">预期卖出价</text>
              <input class="field__input" v-model="newBatchForm.planSellPrice" type="digit" placeholder="0.00" />
            </view>
          </view>
        </view>
        <view class="sheet-actions">
          <button class="btn btn--ghost btn--lg" @click="closeAddBatchForm">取消</button>
          <button
            class="btn btn--primary btn--lg"
            @click="handleSubmitAddBatch(sheetPlanId, showAddBatchFormFor || '')"
          >保存</button>
        </view>
      </view>
    </view>

    <!-- ===== 编辑批次 ===== -->
    <view v-if="showEditBatchFormFor" class="sheet-mask" @click="closeEditBatchForm">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-grabber"></view>
        <view class="sheet-header">
          <text class="sheet-title">编辑批次</text>
          <text class="sheet-close" @click="closeEditBatchForm">×</text>
        </view>
        <view class="sheet-body">
          <view class="field">
            <text class="field__label">数量</text>
            <input class="field__input" v-model="editBatchForm.quantity" type="number" placeholder="数量" />
          </view>
          <view class="field-row">
            <view class="field">
              <text class="field__label">预期买入价</text>
              <input class="field__input" v-model="editBatchForm.planBuyPrice" type="digit" placeholder="0.00" />
            </view>
            <view class="field">
              <text class="field__label">预期卖出价</text>
              <input class="field__input" v-model="editBatchForm.planSellPrice" type="digit" placeholder="0.00" />
            </view>
          </view>
          <view class="field">
            <text class="field__label">名称</text>
            <input class="field__input" v-model="editBatchForm.batchName" placeholder="批次名称（可选）" />
          </view>
        </view>
        <view class="sheet-actions">
          <button class="btn btn--ghost btn--lg" @click="closeEditBatchForm">取消</button>
          <button
            class="btn btn--primary btn--lg"
            @click="handleSubmitEditBatch(sheetPlanId, showEditBatchFormFor || '')"
          >保存</button>
        </view>
      </view>
    </view>

    <!-- ===== 买入 ===== -->
    <view v-if="showBuyFormFor" class="sheet-mask" @click="closeOpForm">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-grabber"></view>
        <view class="sheet-header">
          <text class="sheet-title sheet-title--success">买入</text>
          <text class="sheet-close" @click="closeOpForm">×</text>
        </view>
        <view class="sheet-body">
          <view v-if="!opOptionLocked" class="seg">
            <view class="seg__item" :class="{ 'seg__item--on': opForm.instrument === 'STOCK' }" @click="setOpInstrument('STOCK')">正股</view>
            <view class="seg__item" :class="{ 'seg__item--on': opForm.instrument === 'OPTION' }" @click="setOpInstrument('OPTION')">期权</view>
          </view>
          <view v-if="opForm.instrument === 'OPTION'">
            <view v-if="opOptionLocked" class="field">
              <text class="field__label">期权</text>
              <text class="field__static">{{ opForm.optionType }} · 目标价 {{ opForm.strikePrice }} · 到期 {{ opForm.expirationDate }}</text>
            </view>
            <template v-else>
              <view class="field">
                <text class="field__label">期权类型</text>
                <picker :range="optionTypeOptions" range-key="label" @change="onOpOptionTypeChange">
                  <view class="field__picker">
                    <text>{{ resolveOptionTypeLabel(opForm.optionType) }}</text>
                    <text class="field__picker-arrow">▾</text>
                  </view>
                </picker>
              </view>
              <view class="field-row">
                <view class="field">
                  <text class="field__label">目标价格</text>
                  <input class="field__input" v-model="opForm.strikePrice" type="digit" placeholder="0.00" />
                </view>
                <view class="field">
                  <text class="field__label">到期时间</text>
                  <DatePicker v-model="opForm.expirationDate" mode="date" placeholder="请选择" title="选择到期时间" />
                </view>
              </view>
            </template>
          </view>
          <view class="field">
            <text class="field__label">交易日期</text>
            <DatePicker v-model="opForm.tradeDate" mode="date" placeholder="请选择" title="选择交易日期" />
          </view>
          <view class="field-row">
            <view class="field">
              <text class="field__label">买入价{{ opForm.instrument === 'OPTION' ? '（可为0）' : '' }}</text>
              <input class="field__input" v-model="opForm.price" type="digit" placeholder="0.00" />
            </view>
            <view class="field">
              <text class="field__label">数量{{ opForm.instrument === 'OPTION' ? '（可为负）' : '' }}</text>
              <input class="field__input" v-model="opForm.quantity" type="number" placeholder="0" />
            </view>
          </view>
          <view class="field">
            <text class="field__label">手续费</text>
            <input class="field__input" v-model="opForm.fee" type="digit" placeholder="0" />
          </view>
        </view>
        <view class="sheet-actions">
          <button class="btn btn--ghost btn--lg" @click="closeOpForm">取消</button>
          <button
            class="btn btn--success btn--lg"
            @click="handleSubmitBuy(sheetPlanId, showBuyFormFor || '')"
          >确认买入</button>
        </view>
      </view>
    </view>

    <!-- ===== 卖出 ===== -->
    <view v-if="showSellFormFor" class="sheet-mask" @click="closeOpForm">
      <view class="sheet-panel" @click.stop>
        <view class="sheet-grabber"></view>
        <view class="sheet-header">
          <text class="sheet-title sheet-title--danger">卖出</text>
          <text class="sheet-close" @click="closeOpForm">×</text>
        </view>
        <view class="sheet-body">
          <view v-if="!opOptionLocked" class="seg">
            <view class="seg__item" :class="{ 'seg__item--on': opForm.instrument === 'STOCK' }" @click="setOpInstrument('STOCK')">正股</view>
            <view class="seg__item" :class="{ 'seg__item--on': opForm.instrument === 'OPTION' }" @click="setOpInstrument('OPTION')">期权</view>
          </view>
          <view v-if="opForm.instrument === 'OPTION'">
            <view v-if="opOptionLocked" class="field">
              <text class="field__label">期权</text>
              <text class="field__static">{{ opForm.optionType }} · 目标价 {{ opForm.strikePrice }} · 到期 {{ opForm.expirationDate }}</text>
            </view>
            <template v-else>
              <view class="field">
                <text class="field__label">期权类型</text>
                <picker :range="optionTypeOptions" range-key="label" @change="onOpOptionTypeChange">
                  <view class="field__picker">
                    <text>{{ resolveOptionTypeLabel(opForm.optionType) }}</text>
                    <text class="field__picker-arrow">▾</text>
                  </view>
                </picker>
              </view>
              <view class="field-row">
                <view class="field">
                  <text class="field__label">目标价格</text>
                  <input class="field__input" v-model="opForm.strikePrice" type="digit" placeholder="0.00" />
                </view>
                <view class="field">
                  <text class="field__label">到期时间</text>
                  <DatePicker v-model="opForm.expirationDate" mode="date" placeholder="请选择" title="选择到期时间" />
                </view>
              </view>
            </template>
          </view>
          <view class="field">
            <text class="field__label">交易日期</text>
            <DatePicker v-model="opForm.tradeDate" mode="date" placeholder="请选择" title="选择交易日期" />
          </view>
          <view class="field-row">
            <view class="field">
              <text class="field__label">卖出价{{ opForm.instrument === 'OPTION' ? '（可为0）' : '' }}</text>
              <input class="field__input" v-model="opForm.price" type="digit" placeholder="0.00" />
            </view>
            <view class="field">
              <text class="field__label">数量{{ opForm.instrument === 'OPTION' ? '（可为负）' : '' }}</text>
              <input class="field__input" v-model="opForm.quantity" type="number" placeholder="0" />
            </view>
          </view>
          <view class="field">
            <text class="field__label">手续费</text>
            <input class="field__input" v-model="opForm.fee" type="digit" placeholder="0" />
          </view>
        </view>
        <view class="sheet-actions">
          <button class="btn btn--ghost btn--lg" @click="closeOpForm">取消</button>
          <button
            class="btn btn--danger btn--lg"
            @click="handleSubmitSell(sheetPlanId, showSellFormFor || '')"
          >确认卖出</button>
        </view>
      </view>
    </view>

    <schedule-bottom-bar
      :buttons="bottomButtons"
      :show-group-member="false"
      :auto-load-members="true"
      @member-change="handleGroupMemberChange"
      @buttonClick="handleButtonClick"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'

import scheduleBottomBar from '../../../../components/schedule-bottom-bar.vue'
import DatePicker from '../../../../components/fun-components/date-picker.vue'
import { useFinancialPlanStore } from '../../stores/useFinancialPlanStore'
import { useRealizationStore } from '../../stores/useRealizationStore'
import { ensureCurrentGroup, ensureCurrentMember } from '../../../../utils/currentGroupResolver'
import { STORAGE_KEYS, getStoredData } from '../../../../utils/storageManager'
import {
  assetMarket,
  optionType as optionTypeEnum,
  timeRangeType as timeRangeTypeEnum,
  planType as planTypeEnum,
} from '../../api/financial-plan-types'
import type {
  AssetMarket,
  BatchStats,
  ExerciseAction,
  FinancialPlanListItem,
  InstrumentType,
  OptionKeyStats,
  OptionType,
  RealizationBatch,
  RealizationOperation,
  TimeRangeType,
} from '../../api/financial-plan-types'
import type {
  Api2CreateFinancialPlanRequest,
  Api3UpdateFinancialPlanRequest,
} from '../../api/financial-plan'
import { financialPlanApiClient } from '../../api'

const planStore = useFinancialPlanStore()
const realizationStore = useRealizationStore()

const currentGroup = ref<{ id?: string | number } | null>(null)
const expandedPlanId = ref<string | null>(null)
const hasAutoExpanded = ref(false)

const bottomButtons = ref([{ code: 'addPlan', text: '新建计划' }])

const planList = computed(() => planStore.planList)
const planDetails = computed(() => planStore.planDetails)
const loading = computed(() => planStore.loading)

const sortedPlanList = computed(() => {
  return [...planList.value].sort((a, b) => {
    const aEnd = a.endDate || ''
    const bEnd = b.endDate || ''
    if (aEnd === bEnd) return 0
    if (!aEnd) return 1
    if (!bEnd) return -1
    return bEnd.localeCompare(aEnd)
  })
})

// ===== sheet 状态 =====
/**
 * 因为所有 form 都从 inline 改成了底部 Sheet，离开了原本所在的 v-for 上下文，
 * 提交时还需要 planId / assetId / batchId。下面的 ref 保存"当前打开的 Sheet"对应的
 * planId，配合各 form 自带的 target ref（showXxxFor）一并使用。
 */
const sheetPlanId = ref<string>('')

const showAddAssetFormFor = ref<string | null>(null)
const newAssetForm = reactive({
  stockName: '',
  market: 'CN' as AssetMarket,
  targetProfit: '',
})

const showAddBatchFormFor = ref<string | null>(null)
const newBatchForm = reactive({
  quantity: '',
  planBuyPrice: '',
  planSellPrice: '',
})

const showBuyFormFor = ref<string | null>(null)
const showSellFormFor = ref<string | null>(null)
const showEditBatchFormFor = ref<string | null>(null)

/** 买入/卖出表单：可记录正股或期权（OPTION 时带 optionType/strikePrice/expirationDate）。 */
const opForm = reactive({
  instrument: 'STOCK' as InstrumentType,
  optionType: 'CALL' as OptionType,
  strikePrice: '',
  expirationDate: '',
  tradeDate: todayDateString(),
  price: '',
  quantity: '',
  fee: '',
})
/** 从某个已存在的期权 key 打开买/卖时锁定 key 字段。 */
const opOptionLocked = ref(false)

/** 已展开「操作记录」的批次 id 集合。 */
const expandedOpsBatchIds = ref<string[]>([])

const editBatchForm = reactive({
  batchName: '',
  quantity: '',
  planBuyPrice: '',
  planSellPrice: '',
  version: 0,
})

// ===== plan modal 状态 =====
const showPlanModal = ref(false)
const planModalMode = ref<'create' | 'edit'>('create')
const editingPlanId = ref<string | null>(null)
const planFormState = reactive({
  planName: '',
  timeRangeType: 'CUSTOM' as TimeRangeType,
  fiscalYear: '',
  startDate: '',
  endDate: '',
  targetProfit: '',
  remark: '',
  version: 0,
})

// ===== option lists =====
const marketOptions = [
  { label: '美股', value: assetMarket.us },
  { label: '港股', value: assetMarket.hk },
  { label: 'A 股', value: assetMarket.cn },
] as const

const optionTypeOptions = [
  { label: '看涨 CALL', value: optionTypeEnum.call },
  { label: '看跌 PUT', value: optionTypeEnum.put },
] as const

const timeRangeOptions = [
  { label: '自定义', value: timeRangeTypeEnum.custom },
  { label: '年度', value: timeRangeTypeEnum.year },
] as const

// ===== 数据加载 =====

function todayDateString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function findCurrentPlanId(): string | null {
  if (sortedPlanList.value.length === 0) return null
  const today = todayDateString()
  const containing = sortedPlanList.value.find((plan) => {
    const start = plan.startDate || ''
    const end = plan.endDate || ''
    return start && end && start <= today && today <= end
  })
  if (containing) return String(containing.planId)
  return String(sortedPlanList.value[0].planId)
}

async function fetchPlans(): Promise<void> {
  const groupId = currentGroup.value?.id
  if (groupId === undefined || groupId === null || groupId === '') return
  await planStore.queryPlans({
    groupId: String(groupId),
    pageNo: 1,
    pageSize: 100,
  })
  if (!hasAutoExpanded.value) {
    const target = findCurrentPlanId()
    if (target) {
      expandedPlanId.value = target
      await loadDetailIfNeeded(target)
      await loadOperationsForExpandedPlan(target)
    }
    hasAutoExpanded.value = true
  } else if (expandedPlanId.value) {
    const stillThere = sortedPlanList.value.some((p) => String(p.planId) === expandedPlanId.value)
    if (stillThere) {
      await loadDetailIfNeeded(expandedPlanId.value)
    } else {
      expandedPlanId.value = null
    }
  }
}

async function loadDetailIfNeeded(planId: string): Promise<void> {
  if (!planDetails.value[planId]) {
    await planStore.loadPlanDetail(planId)
  }
}

async function loadOperationsForExpandedPlan(planId: string): Promise<void> {
  const detail = planDetails.value[planId]
  if (!detail) return
  for (const batch of detail.realizationBatches) {
    void realizationStore.loadBatchOperations(planId, String(batch.batchId))
  }
}

async function togglePlan(planId: string): Promise<void> {
  const target = String(planId)
  if (expandedPlanId.value === target) {
    expandedPlanId.value = null
    return
  }
  expandedPlanId.value = target
  await loadDetailIfNeeded(target)
  await loadOperationsForExpandedPlan(target)
}

function batchesByAsset(planId: string, assetId: string): RealizationBatch[] {
  const detail = planDetails.value[planId]
  if (!detail) return []
  return detail.realizationBatches.filter((b) => String(b.assetId) === String(assetId))
}

function batchOperations(batchId: string): RealizationOperation[] {
  return realizationStore.operationsByBatchId[batchId] || []
}

/** 单批次目标收益（无后端 stats 时的兜底计算）。 */
function computeBatchTargetProfit(batch: RealizationBatch): number {
  const buy = Number(batch.planBuyPrice)
  const sell = Number(batch.planSellPrice)
  const qty = Number(batch.quantity)
  if (!Number.isFinite(buy) || !Number.isFinite(sell) || !Number.isFinite(qty)) {
    return 0
  }
  return Number(((sell - buy) * qty).toFixed(2))
}

/** 金额四舍五入到 2 位小数；非数字返回 0。 */
function round2(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100) / 100
}

// ===== 批次卡片汇总（来自后端 batchStats，缺失时本地兜底） =====

function batchStats(batch: RealizationBatch): BatchStats | null {
  const detail = planDetails.value[String(batch.planId)]
  const list = detail?.batchStats || []
  return list.find((s) => String(s.batchId) === String(batch.batchId)) || null
}

function statTargetProfit(batch: RealizationBatch): number {
  const s = batchStats(batch)
  return s ? Number(s.targetProfit) : computeBatchTargetProfit(batch)
}

function statTotalRealized(batch: RealizationBatch): number {
  const s = batchStats(batch)
  return s ? Number(s.totalRealizedProfit) : Number(batch.actualProfit || 0)
}

function statStockRealized(batch: RealizationBatch): number {
  const s = batchStats(batch)
  return s ? Number(s.stockRealizedProfit) : Number(batch.actualProfit || 0)
}

function statOptionRealized(batch: RealizationBatch): number {
  const s = batchStats(batch)
  return s ? Number(s.optionRealizedProfit) : 0
}

function statStockQty(batch: RealizationBatch): number {
  const s = batchStats(batch)
  return s ? Number(s.stockQuantity) : 0
}

function statStockCostPrice(batch: RealizationBatch): number | null {
  const s = batchStats(batch)
  if (!s || s.stockCostPrice === undefined || s.stockCostPrice === null) return null
  return Number(s.stockCostPrice)
}

function statOptionKeys(batch: RealizationBatch): OptionKeyStats[] {
  const s = batchStats(batch)
  return s?.optionKeys || []
}

function optionKeyId(k: OptionKeyStats): string {
  return `${k.optionType}|${k.strikePrice}|${k.expirationDate}`
}

/** 操作记录展开/收起。 */
function toggleOps(batchId: string): void {
  const id = String(batchId)
  const idx = expandedOpsBatchIds.value.indexOf(id)
  if (idx >= 0) {
    expandedOpsBatchIds.value.splice(idx, 1)
  } else {
    expandedOpsBatchIds.value.push(id)
  }
}

function isOpsExpanded(batchId: string): boolean {
  return expandedOpsBatchIds.value.includes(String(batchId))
}

/** 操作记录的类型文案。 */
function opLabel(op: RealizationOperation): string {
  const side = op.operationType === 'BUY' ? '买' : '卖'
  if (op.instrument === 'OPTION') {
    return `期权${op.optionType === 'CALL' ? 'C' : 'P'}${side}`
  }
  return `正股${side}`
}

function resolveOptionTypeLabel(type?: OptionType): string {
  if (type === 'CALL') return '看涨 CALL'
  if (type === 'PUT') return '看跌 PUT'
  return '请选择'
}

/**
 * 市场 → 人民币的汇率（与后端 ExchangeRateConfig 默认值保持一致）。
 *
 * 后端会把每个标的的 plannedProfit / actualProfit 按所属市场换算成 CNY，
 * 前端这里在标的行级别复用同一组汇率，让显示和后端聚合口径一致。
 */
const EXCHANGE_RATE_TO_CNY: Record<string, number> = {
  US: 7.2,
  HK: 0.92,
  CN: 1,
}

function resolveMarketRate(market?: string): number {
  if (!market) return 1
  return EXCHANGE_RATE_TO_CNY[market] ?? 1
}

/** 市场对应的原币种代号；CN 即 CNY，无需在 UI 上额外展示。 */
function resolveMarketCurrencyCode(market?: string): string {
  if (market === 'US') return 'USD'
  if (market === 'HK') return 'HKD'
  if (market === 'CN') return 'CNY'
  return ''
}

/** 单标的「已计划盈利」原币种金额（未乘汇率）= 各批次目标收益之和。 */
function resolveAssetPlannedProfitRaw(planId: string, assetId: string): number {
  return batchesByAsset(planId, assetId).reduce((sum, b) => sum + computeBatchTargetProfit(b), 0)
}

/** 单标的「已实现盈利」原币种金额（未乘汇率）= 各批次累计已实现(正股+期权) 之和。 */
function resolveAssetActualProfitRaw(planId: string, assetId: string): number {
  return batchesByAsset(planId, assetId)
    .reduce((sum, b) => sum + Number(b.actualProfit || 0), 0)
}

/** 计划层「已计划盈利」按市场分组的原币种 + 汇率明细。 */
interface PlanMarketBreakdown {
  market: string
  currency: string
  plannedNative: number
  actualNative: number
  rate: number
}

/**
 * 按市场聚合一个计划下的原币种已计划/已实现金额，便于在计划摘要旁边展示
 * 「USD 479 ×7.2 / HKD 1500 ×0.92 / CNY 5000」这样的换算明细。
 * 没有产生任何金额的市场直接过滤掉。
 */
function resolvePlanMarketBreakdowns(planId: string): PlanMarketBreakdown[] {
  const detail = planDetails.value[planId]
  if (!detail) {
    return []
  }
  const buckets: Record<string, { plannedNative: number; actualNative: number }> = {}
  for (const asset of detail.assets) {
    const market = String(asset.market || '')
    if (!buckets[market]) {
      buckets[market] = { plannedNative: 0, actualNative: 0 }
    }
    buckets[market].plannedNative += resolveAssetPlannedProfitRaw(planId, asset.assetId)
    buckets[market].actualNative += resolveAssetActualProfitRaw(planId, asset.assetId)
  }
  return Object.entries(buckets)
    .map(([market, vals]) => ({
      market,
      currency: resolveMarketCurrencyCode(market),
      plannedNative: Number(vals.plannedNative.toFixed(2)),
      actualNative: Number(vals.actualNative.toFixed(2)),
      rate: resolveMarketRate(market),
    }))
    .filter((b) => b.plannedNative !== 0 || b.actualNative !== 0)
}

/** 标的用户目标盈利，优先用 entity 字段，缺失返回 0。 */
function resolveAssetTargetProfit(planId: string, assetId: string): number {
  const detail = planDetails.value[planId]
  if (!detail) return 0
  const asset = detail.assets.find((a) => String(a.assetId) === String(assetId))
  return Number(asset?.targetProfit || 0)
}

/** 标的「计划完成度」= 已计划盈利 / 目标盈利（均为市场原币种，单位一致）。 */
function resolveAssetPlannedRate(planId: string, assetId: string): number {
  const target = resolveAssetTargetProfit(planId, assetId)
  if (target === 0) return 0
  return resolveAssetPlannedProfitRaw(planId, assetId) / target
}

/** 标的「实际完成度」= 已实现盈利 / 目标盈利（均为市场原币种，单位一致）。 */
function resolveAssetActualRate(planId: string, assetId: string): number {
  const target = resolveAssetTargetProfit(planId, assetId)
  if (target === 0) return 0
  return resolveAssetActualProfitRaw(planId, assetId) / target
}

/** 已结束（endDate < 今天）或已归档则不可编辑。 */
function isPlanEditable(plan: FinancialPlanListItem): boolean {
  if (plan.status === 'ARCHIVED') return false
  if (plan.endDate && plan.endDate < todayDateString()) return false
  return true
}

// ===== 群组与底栏 =====

function handleGroupMemberChange(payload: { currentGroup?: { id?: string | number } | null }): void {
  const next = payload?.currentGroup || null
  const prev = currentGroup.value?.id
  currentGroup.value = next
  if (next?.id !== prev) {
    expandedPlanId.value = null
    hasAutoExpanded.value = false
  }
  fetchPlans()
}

function handleButtonClick(code: string): void {
  if (code === 'addPlan') {
    openCreatePlanModal()
  }
}

// ===== 计划弹窗 =====

function openCreatePlanModal(): void {
  planModalMode.value = 'create'
  editingPlanId.value = null
  resetPlanFormState()
  showPlanModal.value = true
}

function openEditPlanModal(planId: string): void {
  const detail = planDetails.value[planId]
  if (!detail) {
    uni.showToast({ title: '详情还未加载完成', icon: 'none' })
    return
  }
  planModalMode.value = 'edit'
  editingPlanId.value = planId
  planFormState.planName = detail.plan.planName || ''
  planFormState.timeRangeType = detail.plan.timeRangeType || 'CUSTOM'
  planFormState.fiscalYear = detail.plan.fiscalYear ? String(detail.plan.fiscalYear) : ''
  planFormState.startDate = detail.plan.startDate || ''
  planFormState.endDate = detail.plan.endDate || ''
  planFormState.targetProfit = detail.plan.targetProfit !== undefined && detail.plan.targetProfit !== null
    ? String(detail.plan.targetProfit)
    : ''
  planFormState.remark = detail.plan.remark || ''
  planFormState.version = detail.plan.version || 0
  showPlanModal.value = true
}

function closePlanModal(): void {
  showPlanModal.value = false
}

function resetPlanFormState(): void {
  planFormState.planName = ''
  planFormState.timeRangeType = 'CUSTOM'
  planFormState.fiscalYear = ''
  planFormState.startDate = todayDateString()
  planFormState.endDate = ''
  planFormState.targetProfit = ''
  planFormState.remark = ''
  planFormState.version = 0
}

function onPlanTimeRangeChange(event: { detail: { value: number } }): void {
  const idx = Number(event.detail.value)
  planFormState.timeRangeType = (timeRangeOptions[idx]?.value as TimeRangeType) || 'CUSTOM'
}

async function handleSubmitPlan(): Promise<void> {
  if (!planFormState.planName.trim()) {
    await uni.showToast({ title: '请填写计划名称', icon: 'none' })
    return
  }
  if (planFormState.timeRangeType === 'YEAR') {
    if (!planFormState.fiscalYear) {
      await uni.showToast({ title: '请填写年度', icon: 'none' })
      return
    }
  } else {
    if (!planFormState.startDate || !planFormState.endDate) {
      await uni.showToast({ title: '请填写开始/结束日期', icon: 'none' })
      return
    }
  }

  if (planModalMode.value === 'create') {
    await ensureCurrentGroup()
    const group = getStoredData<{ id?: string | number }>(STORAGE_KEYS.CURRENT_GROUP)
    if (!group?.id) {
      await uni.showToast({ title: '请先选择小队', icon: 'none' })
      return
    }
    await ensureCurrentMember(group.id)
    const loginUser = getStoredData<{ id?: string | number }>(STORAGE_KEYS.USER_INFO)
    const currentMember = getStoredData<{ userId?: string | number; id?: string | number }>(STORAGE_KEYS.CURRENT_MEMBER)
    const ownerUserId = loginUser?.id !== undefined
      ? String(loginUser.id)
      : (currentMember?.userId !== undefined ? String(currentMember.userId) : '')
    const request: Api2CreateFinancialPlanRequest = {
      groupId: String(group.id),
      ownerUserId,
      planName: planFormState.planName.trim(),
      planType: planTypeEnum.savings,
      timeRangeType: planFormState.timeRangeType,
      fiscalYear: planFormState.fiscalYear ? Number(planFormState.fiscalYear) : undefined,
      startDate: planFormState.startDate || undefined,
      endDate: planFormState.endDate || undefined,
      targetProfit: planFormState.targetProfit !== '' ? Number(planFormState.targetProfit) : undefined,
      remark: planFormState.remark || undefined,
    }
    const newPlanId = await planStore.createPlan(request)
    if (newPlanId) {
      await uni.showToast({ title: '计划已创建', icon: 'success' })
      closePlanModal()
      expandedPlanId.value = newPlanId
      await planStore.loadPlanDetail(newPlanId)
      await fetchPlans()
    }
    return
  }

  if (!editingPlanId.value) return
  const updateRequest: Api3UpdateFinancialPlanRequest = {
    planName: planFormState.planName.trim(),
    status: 'ACTIVE',
    timeRangeType: planFormState.timeRangeType,
    fiscalYear: planFormState.fiscalYear ? Number(planFormState.fiscalYear) : undefined,
    startDate: planFormState.startDate || undefined,
    endDate: planFormState.endDate || undefined,
    targetProfit: planFormState.targetProfit !== '' ? Number(planFormState.targetProfit) : undefined,
    remark: planFormState.remark || undefined,
    version: planFormState.version,
  }
  const ok = await planStore.updatePlan(editingPlanId.value, updateRequest)
  if (ok) {
    await uni.showToast({ title: '已保存', icon: 'success' })
    closePlanModal()
    await planStore.loadPlanDetail(editingPlanId.value)
    await fetchPlans()
  }
}

async function handleArchivePlan(plan: FinancialPlanListItem): Promise<void> {
  if (!plan.planId) return
  const actionLabel = plan.status === 'ARCHIVED' ? '恢复' : '归档'
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: `${actionLabel}计划`,
      content: `确认${actionLabel}「${plan.planName}」吗？`,
      success: (result) => resolve(Boolean(result.confirm)),
      fail: () => resolve(false),
    })
  })
  if (!confirmed) return

  if (plan.status === 'ARCHIVED') {
    // 恢复：先刷新详情拿到最新 version，再走 updatePlan(status=ACTIVE)。
    const fresh = await planStore.loadPlanDetail(plan.planId)
    if (!fresh) {
      return
    }
    await planStore.updatePlan(plan.planId, {
      planName: fresh.plan.planName,
      status: 'ACTIVE',
      timeRangeType: fresh.plan.timeRangeType,
      fiscalYear: fresh.plan.fiscalYear,
      startDate: fresh.plan.startDate,
      endDate: fresh.plan.endDate,
      remark: fresh.plan.remark,
      targetProfit: fresh.plan.targetProfit,
      version: fresh.plan.version,
    })
  } else {
    // 归档：后端已经做了幂等处理（不再校验 version、并把 endDate 设为今天），直接调用即可。
    const version = planDetails.value[plan.planId]?.plan.version || 1
    await planStore.archivePlan(plan.planId, version)
  }
  await fetchPlans()
}

// ===== Asset sheet =====

function openAddAssetSheet(planId: string): void {
  sheetPlanId.value = planId
  showAddAssetFormFor.value = planId
  newAssetForm.stockName = ''
  newAssetForm.market = 'CN'
  newAssetForm.targetProfit = ''
}

function closeAddAssetForm(): void {
  showAddAssetFormFor.value = null
}

function onNewAssetMarketChange(event: { detail: { value: number } }): void {
  const idx = Number(event.detail.value)
  newAssetForm.market = marketOptions[idx]?.value || 'CN'
}

async function handleSubmitAddAsset(planId: string): Promise<void> {
  if (!newAssetForm.stockName.trim()) {
    await uni.showToast({ title: '请填写股票名称', icon: 'none' })
    return
  }
  const targetProfitNum = Number(newAssetForm.targetProfit)
  if (!Number.isFinite(targetProfitNum)) {
    await uni.showToast({ title: '请填写目标盈利', icon: 'none' })
    return
  }
  const sequenceNo = (planDetails.value[planId]?.assets.length || 0) + 1
  try {
    await financialPlanApiClient.saveAssets(planId, {
      items: [
        {
          stockName: newAssetForm.stockName.trim(),
          market: newAssetForm.market,
          targetProfit: targetProfitNum,
          sequenceNo,
        },
      ],
    })
    closeAddAssetForm()
    await uni.showToast({ title: '标的已保存', icon: 'success' })
    await planStore.loadPlanDetail(planId)
  } catch (error) {
    console.warn('saveAssets failed:', error)
    await uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}

// ===== Batch sheets =====

function openAddBatchSheet(planId: string, assetId: string): void {
  sheetPlanId.value = planId
  showAddBatchFormFor.value = assetId
  newBatchForm.quantity = ''
  newBatchForm.planBuyPrice = ''
  newBatchForm.planSellPrice = ''
}

function closeAddBatchForm(): void {
  showAddBatchFormFor.value = null
}

async function handleSubmitAddBatch(planId: string, assetId: string): Promise<void> {
  const quantityNum = Number(newBatchForm.quantity)
  const buyNum = round2(Number(newBatchForm.planBuyPrice))
  const sellNum = round2(Number(newBatchForm.planSellPrice))
  if (!(quantityNum > 0)) {
    await uni.showToast({ title: '请填写数量（>0）', icon: 'none' })
    return
  }
  if (!(buyNum > 0) || !(sellNum > 0)) {
    await uni.showToast({ title: '请填写预期买入/卖出价（>0）', icon: 'none' })
    return
  }
  const result = await realizationStore.createBatch(planId, {
    assetId,
    quantity: quantityNum,
    planBuyPrice: buyNum,
    planSellPrice: sellNum,
  })
  if (result) {
    closeAddBatchForm()
    await uni.showToast({ title: '批次已创建', icon: 'success' })
    await planStore.loadPlanDetail(planId)
  }
}

// ===== Buy / Sell sheets =====

function openBuySheet(planId: string, batchId: string): void {
  sheetPlanId.value = planId
  showSellFormFor.value = null
  showEditBatchFormFor.value = null
  resetOpForm()
  showBuyFormFor.value = batchId
}

function openSellSheet(planId: string, batchId: string): void {
  sheetPlanId.value = planId
  showBuyFormFor.value = null
  showEditBatchFormFor.value = null
  resetOpForm()
  showSellFormFor.value = batchId
}

/** 从某个期权 key 打开买入（用于平掉空头）。 */
function openOptionBuySheet(planId: string, batchId: string, k: OptionKeyStats): void {
  openBuySheet(planId, batchId)
  prefillOptionKey(k)
}

/** 从某个期权 key 打开卖出（用于平掉多头）。 */
function openOptionSellSheet(planId: string, batchId: string, k: OptionKeyStats): void {
  openSellSheet(planId, batchId)
  prefillOptionKey(k)
}

function prefillOptionKey(k: OptionKeyStats): void {
  opForm.instrument = 'OPTION'
  opForm.optionType = k.optionType
  opForm.strikePrice = String(k.strikePrice ?? '')
  opForm.expirationDate = k.expirationDate || ''
  opOptionLocked.value = true
}

function setOpInstrument(instrument: InstrumentType): void {
  opForm.instrument = instrument
}

function onOpOptionTypeChange(event: { detail: { value: number } }): void {
  const idx = Number(event.detail.value)
  opForm.optionType = optionTypeOptions[idx]?.value || 'CALL'
}

function closeOpForm(): void {
  showBuyFormFor.value = null
  showSellFormFor.value = null
}

function resetOpForm(): void {
  opForm.instrument = 'STOCK'
  opForm.optionType = 'CALL'
  opForm.strikePrice = ''
  opForm.expirationDate = ''
  opForm.tradeDate = todayDateString()
  opForm.price = ''
  opForm.quantity = ''
  opForm.fee = ''
  opOptionLocked.value = false
}

/** 校验买/卖操作公共字段，返回构造好的请求片段；非法时 toast 并返回 null。 */
async function buildOpRequest(): Promise<{
  instrument: InstrumentType
  tradeDate: string
  quantity: number
  fee: number
  optionType?: OptionType
  strikePrice?: number
  expirationDate?: string
} | null> {
  if (!opForm.tradeDate) {
    await uni.showToast({ title: '请填写交易日期', icon: 'none' })
    return null
  }
  const qtyNum = Number(opForm.quantity)
  const feeNum = opForm.fee === '' ? 0 : round2(Number(opForm.fee))
  if (opForm.instrument === 'OPTION') {
    if (!Number.isFinite(qtyNum) || qtyNum === 0) {
      await uni.showToast({ title: '期权数量需为非 0 数字', icon: 'none' })
      return null
    }
    const strikeNum = round2(Number(opForm.strikePrice))
    if (!(strikeNum > 0)) {
      await uni.showToast({ title: '请填写目标价格（>0）', icon: 'none' })
      return null
    }
    if (!opForm.expirationDate) {
      await uni.showToast({ title: '请选择到期时间', icon: 'none' })
      return null
    }
    return {
      instrument: 'OPTION',
      tradeDate: opForm.tradeDate,
      quantity: qtyNum,
      fee: feeNum,
      optionType: opForm.optionType,
      strikePrice: strikeNum,
      expirationDate: opForm.expirationDate,
    }
  }
  if (!(qtyNum > 0)) {
    await uni.showToast({ title: '请填写数量（>0）', icon: 'none' })
    return null
  }
  return { instrument: 'STOCK', tradeDate: opForm.tradeDate, quantity: qtyNum, fee: feeNum }
}

async function handleSubmitBuy(planId: string, batchId: string): Promise<void> {
  const base = await buildOpRequest()
  if (!base) return
  const priceNum = opForm.price === '' ? 0 : round2(Number(opForm.price))
  if (base.instrument === 'STOCK' && !(priceNum > 0)) {
    await uni.showToast({ title: '请填写买入价（>0）', icon: 'none' })
    return
  }
  const result = await realizationStore.recordBuy(planId, batchId, {
    ...base,
    actualBuyPrice: priceNum,
  })
  if (result) {
    closeOpForm()
    await uni.showToast({ title: '买入已记录', icon: 'success' })
    await Promise.all([
      realizationStore.loadBatchOperations(planId, batchId),
      planStore.loadPlanDetail(planId),
    ])
  }
}

// ===== 批次编辑 sheet =====

function openEditBatchSheet(planId: string, batch: RealizationBatch): void {
  sheetPlanId.value = planId
  showBuyFormFor.value = null
  showSellFormFor.value = null
  showEditBatchFormFor.value = String(batch.batchId)
  editBatchForm.batchName = batch.batchName || ''
  editBatchForm.quantity = String(batch.quantity ?? '')
  editBatchForm.planBuyPrice = String(batch.planBuyPrice ?? '')
  editBatchForm.planSellPrice = String(batch.planSellPrice ?? '')
  editBatchForm.version = batch.version ?? 0
}

function closeEditBatchForm(): void {
  showEditBatchFormFor.value = null
}

async function handleSubmitEditBatch(planId: string, batchId: string): Promise<void> {
  const quantityNum = Number(editBatchForm.quantity)
  const buyNum = round2(Number(editBatchForm.planBuyPrice))
  const sellNum = round2(Number(editBatchForm.planSellPrice))
  if (!(quantityNum > 0)) {
    await uni.showToast({ title: '请填写数量（>0）', icon: 'none' })
    return
  }
  if (!(buyNum > 0)) {
    await uni.showToast({ title: '请填写预期买入价（>0）', icon: 'none' })
    return
  }
  if (!(sellNum > 0)) {
    await uni.showToast({ title: '请填写预期卖出价（>0）', icon: 'none' })
    return
  }
  const result = await realizationStore.updateBatch(planId, batchId, {
    batchName: editBatchForm.batchName || undefined,
    quantity: quantityNum,
    planBuyPrice: buyNum,
    planSellPrice: sellNum,
    version: editBatchForm.version,
  })
  if (result) {
    closeEditBatchForm()
    await uni.showToast({ title: '批次已更新', icon: 'success' })
    await planStore.loadPlanDetail(planId)
  }
}

async function handleSubmitSell(planId: string, batchId: string): Promise<void> {
  const base = await buildOpRequest()
  if (!base) return
  const priceNum = opForm.price === '' ? 0 : round2(Number(opForm.price))
  if (base.instrument === 'STOCK' && !(priceNum > 0)) {
    await uni.showToast({ title: '请填写卖出价（>0）', icon: 'none' })
    return
  }
  const result = await realizationStore.recordSell(planId, batchId, {
    ...base,
    actualSellPrice: priceNum,
  })
  if (result) {
    closeOpForm()
    await uni.showToast({ title: '卖出已记录', icon: 'success' })
    await Promise.all([
      realizationStore.loadBatchOperations(planId, batchId),
      planStore.loadPlanDetail(planId),
    ])
  }
}

// ===== 行权 / 被行权 =====

function confirmModal(title: string, content: string): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title,
      content,
      success: (r) => resolve(!!r.confirm),
      fail: () => resolve(false),
    })
  })
}

async function handleExercise(
  planId: string,
  batchId: string,
  k: OptionKeyStats,
  action: ExerciseAction,
): Promise<void> {
  const label = action === 'EXERCISE' ? '行权' : '被行权'
  const stockSide = resolveExerciseStockSide(k.optionType, action)
  const ok = await confirmModal(
    `${label}确认`,
    `对 ${k.optionType} 目标价 ${formatNumber(k.strikePrice)} / 到期 ${k.expirationDate} 执行${label}：` +
      `期权按价 0 平仓，并自动生成一条正股「${stockSide}」记录（价 = 目标价，数量 ${Math.abs(Number(k.netQuantity))}）。`,
  )
  if (!ok) return
  const result = await realizationStore.exerciseOption(planId, batchId, {
    optionType: k.optionType,
    strikePrice: Number(k.strikePrice),
    expirationDate: k.expirationDate,
    action,
  })
  if (result) {
    await uni.showToast({ title: `${label}已记录`, icon: 'success' })
    await Promise.all([
      realizationStore.loadBatchOperations(planId, batchId),
      planStore.loadPlanDetail(planId),
    ])
  }
}

/** 行权/被行权对应的正股方向文案。 */
function resolveExerciseStockSide(optionType: OptionType, action: ExerciseAction): string {
  if (action === 'EXERCISE') {
    return optionType === 'CALL' ? '买入' : '卖出'
  }
  return optionType === 'CALL' ? '卖出' : '买入'
}

// ===== labels & formatters =====

function resolveMarketLabel(market?: string): string {
  if (market === assetMarket.us) return '美股'
  if (market === assetMarket.hk) return '港股'
  if (market === assetMarket.cn) return 'A 股'
  return '未指定市场'
}

function resolveMarketChipClass(market?: string): string {
  if (market === assetMarket.us) return 'chip--us'
  if (market === assetMarket.hk) return 'chip--hk'
  if (market === assetMarket.cn) return 'chip--cn'
  return ''
}

function resolveBatchTitle(batch: RealizationBatch): string {
  if (batch.batchName) return batch.batchName
  return '正股批次'
}

function resolveTimeRangeLabel(value?: string): string {
  if (value === 'YEAR') return '年度'
  return '自定义'
}

function resolveDateRangeLabel(plan: FinancialPlanListItem): string {
  if (!plan.startDate && !plan.endDate) return '未设置时间窗'
  return `${plan.startDate || '?'} ~ ${plan.endDate || '?'}`
}

/** 标签：已归档 / 已结束 / 进行中。 */
function resolveStatusLabel(plan: FinancialPlanListItem): string {
  if (plan.status === 'ARCHIVED') return '归档'
  if (plan.endDate && plan.endDate < todayDateString()) return '已结束'
  return '进行中'
}

function resolveStatusClass(plan: FinancialPlanListItem): string {
  if (plan.status === 'ARCHIVED') return 'status--archived'
  if (plan.endDate && plan.endDate < todayDateString()) return 'status--ended'
  return 'status--active'
}

function resolveStageLabel(stageStatus: RealizationBatch['stageStatus']): string {
  if (stageStatus === 'COMPLETED') return '已完成'
  if (stageStatus === 'PENDING_SELL') return '待卖出'
  if (stageStatus === 'PARTIAL_BOUGHT') return '已买入'
  return '待买入'
}

function resolveStageToneClass(stageStatus: RealizationBatch['stageStatus']): string {
  if (stageStatus === 'COMPLETED') return 'tone--completed'
  if (stageStatus === 'PENDING_SELL') return 'tone--pending-sell'
  if (stageStatus === 'PARTIAL_BOUGHT') return 'tone--partial'
  return 'tone--pending-buy'
}

function formatNumber(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return num.toFixed(2)
}

/** 盈利专用：空值 / 未完成兑现都展示为 0.00（而非 —）。 */
function formatProfit(value: number | string | undefined | null): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return (0).toFixed(2)
  return num.toFixed(2)
}

function formatPercent(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return `${(num * 100).toFixed(1)}%`
}

/** 进度条宽度（0%~100% 之间）。 */
function progressBarWidth(rate: number | string | undefined | null): string {
  const num = Number(rate)
  if (!Number.isFinite(num) || num <= 0) return '0%'
  const pct = Math.min(num * 100, 100)
  return `${pct.toFixed(1)}%`
}

/** 正盈利 / 负盈利的色彩 class。 */
function profitToneClass(value: number | string | undefined | null): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return 'muted'
  if (num > 0) return 'positive'
  if (num < 0) return 'negative'
  return 'muted'
}

onShow(() => {
  if (currentGroup.value?.id) {
    fetchPlans()
  }
})
</script>

<style scoped>
/* ===== Design tokens =====
 * 整页配色统一收敛在以下几个 token 上：
 *   --bg               页面背景
 *   --card             卡片背景
 *   --primary          主操作色（indigo 600）
 *   --success/danger   买入 / 卖出 / 收益正负色
 *   --text-*           文本灰阶
 */
.page-container {
  min-height: 100vh;
  padding-bottom: 220rpx;
  background: linear-gradient(180deg, #f6f8fc 0%, #eef2ff 100%);
  --bar-accent: #4f46e5;
  --bar-accent-shadow: rgba(79, 70, 229, 0.3);
}

/* ===== Page header ===== */
.page-header {
  padding: 40rpx 28rpx 12rpx;
}

.page-header__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16rpx;
}

.page-title {
  display: block;
  color: #0f172a;
  font-size: 40rpx;
  font-weight: 700;
  letter-spacing: 0.5rpx;
}

.page-subtitle {
  display: block;
  margin-top: 6rpx;
  color: #64748b;
  font-size: 24rpx;
}

.page-counter {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(99, 102, 241, 0.1);
  color: #4f46e5;
  font-size: 22rpx;
}

.content-container {
  padding: 16rpx 24rpx 0;
}

/* ===== Empty state ===== */
.empty-state {
  margin: 80rpx auto;
  padding: 64rpx 24rpx;
  text-align: center;
  background: #ffffff;
  border-radius: 28rpx;
  box-shadow: 0 14rpx 36rpx rgba(15, 23, 42, 0.06);
}

.empty-state__title {
  display: block;
  color: #0f172a;
  font-size: 28rpx;
  font-weight: 600;
}

.empty-state__hint {
  display: block;
  margin-top: 10rpx;
  color: #94a3b8;
  font-size: 24rpx;
}

/* ===== Plan list ===== */
.plan-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.plan-card {
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 14rpx 36rpx rgba(15, 23, 42, 0.06);
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.plan-card--expanded {
  box-shadow: 0 22rpx 48rpx rgba(79, 70, 229, 0.12);
}

.plan-card--archived {
  opacity: 0.7;
}

.plan-card__head {
  padding: 24rpx 26rpx 18rpx;
}

.plan-card__head-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14rpx;
}

.plan-card__head-left {
  flex: 1;
  min-width: 0;
}

.plan-card__name {
  display: block;
  color: #0f172a;
  font-size: 32rpx;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plan-card__meta {
  display: block;
  margin-top: 6rpx;
  color: #94a3b8;
  font-size: 22rpx;
  font-feature-settings: 'tnum';
}

.plan-card__head-right {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.plan-card__status {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 500;
}

.status--active {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}
.status--ended {
  background: rgba(148, 163, 184, 0.18);
  color: #475569;
}
.status--archived {
  background: rgba(244, 114, 182, 0.14);
  color: #be185d;
}

.plan-card__caret {
  color: #94a3b8;
  font-size: 30rpx;
}

/* Progress strip in card head */
.plan-card__progress {
  margin-top: 16rpx;
}

.progress-bar {
  width: 100%;
  height: 12rpx;
  border-radius: 999rpx;
  background: #eef2ff;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  border-radius: 999rpx;
  transition: width 0.3s;
}

.progress-bar__fill.positive {
  background: linear-gradient(90deg, #10b981, #059669);
}
.progress-bar__fill.negative {
  background: linear-gradient(90deg, #f87171, #dc2626);
}
.progress-bar__fill.muted {
  background: linear-gradient(90deg, #c7d2fe, #a5b4fc);
}

.progress-bar__legend {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  font-feature-settings: 'tnum';
}

/* ===== Plan body ===== */
.plan-card__body {
  padding: 0 26rpx 24rpx;
  border-top: 1rpx solid #f1f5f9;
  padding-top: 18rpx;
}

.loading-text {
  padding: 36rpx;
  text-align: center;
  color: #64748b;
  font-size: 24rpx;
}

/* ===== Metric row ===== */
.metric-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 14rpx;
}

.metric {
  flex: 1;
  padding: 18rpx 16rpx;
  border-radius: 18rpx;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

.metric__label {
  display: block;
  color: #64748b;
  font-size: 22rpx;
}

.metric__value {
  display: block;
  margin-top: 6rpx;
  color: #0f172a;
  font-size: 30rpx;
  font-weight: 700;
  font-feature-settings: 'tnum';
}

.metric__sub {
  display: block;
  margin-top: 4rpx;
  color: #64748b;
  font-size: 20rpx;
}

/* ===== Breakdown chips ===== */
.breakdown-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.breakdown-chip {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(241, 245, 249, 0.8);
  font-size: 21rpx;
  font-feature-settings: 'tnum';
}

.breakdown-chip__currency {
  color: #4f46e5;
  font-weight: 600;
}

.breakdown-chip__amount {
  color: #475569;
}

.breakdown-chip__rate {
  color: #94a3b8;
  font-size: 19rpx;
}

/* ===== Plan-level actions ===== */
.plan-actions {
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
  margin-bottom: 18rpx;
}

/* ===== Asset card ===== */
.empty-mini {
  margin: 16rpx 0;
  padding: 18rpx;
  text-align: center;
  color: #94a3b8;
  font-size: 22rpx;
  background: rgba(248, 250, 252, 0.7);
  border-radius: 14rpx;
}

.empty-mini--sub {
  margin: 8rpx 0 0;
  padding: 12rpx;
  background: transparent;
  font-size: 20rpx;
}

.asset-card {
  margin-top: 12rpx;
  padding: 16rpx 18rpx;
  border-radius: 20rpx;
  background: rgba(248, 250, 252, 0.8);
}

.asset-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12rpx;
}

.asset-card__head-left {
  flex: 1;
  min-width: 0;
}

.asset-card__title-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.asset-card__name {
  color: #0f172a;
  font-size: 26rpx;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-card__meta {
  display: block;
  margin-top: 6rpx;
  color: #475569;
  font-size: 22rpx;
  font-feature-settings: 'tnum';
}

.asset-card__rate {
  display: block;
  margin-top: 2rpx;
  color: #94a3b8;
  font-size: 20rpx;
}

.market-chip {
  display: inline-block;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 600;
  letter-spacing: 0.5rpx;
}
.chip--us {
  background: #dbeafe;
  color: #1d4ed8;
}
.chip--hk {
  background: #fee2e2;
  color: #b91c1c;
}
.chip--cn {
  background: #fef3c7;
  color: #b45309;
}

.currency-tag {
  display: inline-block;
  margin-right: 6rpx;
  padding: 1rpx 8rpx;
  border-radius: 6rpx;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 20rpx;
  font-weight: 500;
}

/* ===== Batch row ===== */
.batch-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12rpx;
  margin-top: 10rpx;
  padding: 12rpx;
  border-left: 4rpx solid #c7d2fe;
  background: #ffffff;
  border-radius: 12rpx;
}

.batch-row__main {
  flex: 1;
  min-width: 0;
}

.batch-row__title-line {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}

.batch-row__name {
  color: #0f172a;
  font-size: 24rpx;
  font-weight: 600;
}

.batch-row__type {
  display: block;
  margin-top: 4rpx;
  color: #64748b;
  font-size: 21rpx;
}

.batch-row__summary {
  display: block;
  margin-top: 4rpx;
  color: #475569;
  font-size: 22rpx;
  font-feature-settings: 'tnum';
}

.batch-row__profit {
  display: block;
  margin-top: 4rpx;
  color: #64748b;
  font-size: 22rpx;
  font-feature-settings: 'tnum';
}

.batch-row__actions {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  flex-shrink: 0;
}

.status-badge {
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  font-weight: 500;
}
.tone--completed {
  background: #d1fae5;
  color: #047857;
}
.tone--pending-sell {
  background: #fef3c7;
  color: #b45309;
}
.tone--partial {
  background: #e0e7ff;
  color: #3730a3;
}
.tone--pending-buy {
  background: #f1f5f9;
  color: #475569;
}

/* ===== Op grid ===== */
.op-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6rpx;
  margin-top: 10rpx;
}

.op-cell {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 8rpx;
  border-radius: 8rpx;
  font-size: 21rpx;
  font-feature-settings: 'tnum';
}

.op-cell--buy {
  background: rgba(220, 252, 231, 0.6);
  color: #166534;
}
.op-cell--sell {
  background: rgba(254, 226, 226, 0.6);
  color: #991b1b;
}

.op-cell__type {
  flex-shrink: 0;
  padding: 2rpx 8rpx;
  line-height: 28rpx;
  text-align: center;
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.7);
  font-size: 18rpx;
  font-weight: 600;
  white-space: nowrap;
}

.op-cell__line {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== 批次卡片汇总（#771） ===== */
.bstat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8rpx;
  margin-top: 12rpx;
}
.bstat {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  padding: 8rpx 10rpx;
  border-radius: 10rpx;
  background: rgba(99, 102, 241, 0.06);
}
.bstat__label {
  font-size: 19rpx;
  color: #64748b;
}
.bstat__value {
  font-size: 23rpx;
  font-weight: 600;
  color: #1e293b;
  font-feature-settings: 'tnum';
}

.optkey-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-top: 12rpx;
}
.optkey-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
  padding: 10rpx 12rpx;
  border-radius: 10rpx;
  background: rgba(15, 23, 42, 0.03);
  border: 1px solid rgba(15, 23, 42, 0.06);
}
.optkey-row__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}
.optkey-row__title {
  font-size: 22rpx;
  font-weight: 600;
  color: #1e293b;
}
.optkey-row__meta {
  font-size: 20rpx;
  color: #64748b;
  font-feature-settings: 'tnum';
}
.optkey-row__actions {
  display: flex;
  gap: 6rpx;
  flex-shrink: 0;
}
.opt-chip {
  display: inline-block;
  padding: 1rpx 8rpx;
  border-radius: 8rpx;
  font-size: 18rpx;
  font-weight: 700;
  margin-right: 4rpx;
}
.opt-chip--call {
  background: rgba(220, 252, 231, 0.9);
  color: #166534;
}
.opt-chip--put {
  background: rgba(254, 226, 226, 0.9);
  color: #991b1b;
}

.ops-toggle {
  margin-top: 10rpx;
}
.ops-toggle__text {
  font-size: 20rpx;
  color: #4f46e5;
}

/* 买/卖表单：正股 / 期权切换 */
.seg {
  display: flex;
  gap: 6rpx;
  padding: 4rpx;
  border-radius: 12rpx;
  background: rgba(15, 23, 42, 0.05);
  margin-bottom: 12rpx;
}
.seg__item {
  flex: 1;
  text-align: center;
  padding: 12rpx 0;
  border-radius: 10rpx;
  font-size: 24rpx;
  color: #475569;
}
.seg__item--on {
  background: #ffffff;
  color: #4f46e5;
  font-weight: 600;
  box-shadow: 0 1rpx 4rpx rgba(15, 23, 42, 0.12);
}

.sheet-hint {
  display: block;
  font-size: 21rpx;
  color: #94a3b8;
  margin-bottom: 12rpx;
  line-height: 1.5;
}
.field__static {
  font-size: 24rpx;
  color: #1e293b;
  padding: 12rpx 0;
}

/* ===== Tone helpers ===== */
.positive {
  color: #047857;
  font-weight: 500;
}
.negative {
  color: #b91c1c;
  font-weight: 500;
}
.muted {
  color: #94a3b8;
}

/* ===== Button system ===== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0 18rpx;
  height: 56rpx;
  line-height: 1;
  border: none;
  border-radius: 999rpx;
  font-size: 22rpx;
  font-weight: 500;
  background: #eef2ff;
  color: #475569;
  transition: opacity 0.2s, transform 0.1s;
}

.btn::after {
  border: none;
}

.btn:active {
  transform: scale(0.97);
}

.btn[disabled] {
  background: #f1f5f9 !important;
  color: #cbd5e1 !important;
}

.btn--mini {
  height: 48rpx;
  padding: 0 14rpx;
  font-size: 20rpx;
}

.btn--lg {
  flex: 1;
  height: 80rpx;
  font-size: 26rpx;
}

.btn--primary {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #ffffff;
}

.btn--ghost {
  background: #f1f5f9;
  color: #475569;
}

.btn--success {
  background: linear-gradient(135deg, #059669, #10b981);
  color: #ffffff;
}

.btn--danger {
  background: linear-gradient(135deg, #dc2626, #ef4444);
  color: #ffffff;
}

/* ===== Bottom sheet ===== */
.sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.55);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet-panel {
  width: 100%;
  max-height: 85vh;
  background: #ffffff;
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom);
}

.sheet-grabber {
  width: 80rpx;
  height: 8rpx;
  margin: 12rpx auto 0;
  border-radius: 999rpx;
  background: #e2e8f0;
}

.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 28rpx 16rpx;
}

.sheet-title {
  color: #0f172a;
  font-size: 32rpx;
  font-weight: 700;
}

.sheet-title--success {
  color: #059669;
}

.sheet-title--danger {
  color: #dc2626;
}

.sheet-close {
  width: 56rpx;
  height: 56rpx;
  line-height: 52rpx;
  text-align: center;
  border-radius: 50%;
  background: #f1f5f9;
  color: #64748b;
  font-size: 36rpx;
}

.sheet-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 8rpx 28rpx 24rpx;
}

.sheet-actions {
  display: flex;
  gap: 14rpx;
  padding: 16rpx 28rpx 24rpx;
  border-top: 1rpx solid #f1f5f9;
}

/* ===== Field ===== */
.field {
  display: flex;
  flex-direction: column;
  margin-bottom: 16rpx;
}

.field-row {
  display: flex;
  gap: 14rpx;
  margin-bottom: 16rpx;
}

.field-row > .field {
  flex: 1;
  margin-bottom: 0;
}

.field__label {
  display: block;
  margin-bottom: 8rpx;
  color: #475569;
  font-size: 22rpx;
}

.field__input,
.field__picker {
  width: 100%;
  min-height: 80rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  border: 1rpx solid #e2e8f0;
  border-radius: 14rpx;
  background: #f8fafc;
  color: #0f172a;
  font-size: 26rpx;
}

.field__picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field__picker-arrow {
  color: #94a3b8;
  font-size: 22rpx;
}

.field__textarea {
  width: 100%;
  min-height: 140rpx;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  border: 1rpx solid #e2e8f0;
  border-radius: 14rpx;
  background: #f8fafc;
  color: #0f172a;
  font-size: 26rpx;
}
</style>
