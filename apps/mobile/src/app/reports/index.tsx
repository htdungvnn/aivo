/**
 * Health Reports Screen
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useColorScheme } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';

import { Colors } from '@/constants/theme';
import { healthReportApi, type ReportSchedule, type HealthReport, type ReportJob } from '@/services/health-report-api';

export default function HealthReportsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schedule, setSchedule] = useState<ReportSchedule | null>(null);
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [generatingJob, setGeneratingJob] = useState<ReportJob | null>(null);
  
  // Schedule form state
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [deliveryDay, setDeliveryDay] = useState(1); // Monday
  const [deliveryTime, setDeliveryTime] = useState(new Date());
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [locale, setLocale] = useState<'en' | 'vi'>('en');
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [scheduleData, reportsData] = await Promise.all([
        healthReportApi.getSchedule(),
        healthReportApi.listReports(20, 0),
      ]);
      
      if (scheduleData.schedules.length > 0) {
        const activeSchedule = scheduleData.schedules.find(s => s.status !== 'deleted');
        if (activeSchedule) {
          setSchedule(activeSchedule);
          setFrequency(activeSchedule.frequency as 'weekly' | 'monthly');
          setDeliveryDay(activeSchedule.deliveryDay ?? 1);
          setEmailEnabled(activeSchedule.emailEnabled);
          setLocale(activeSchedule.locale);
          // Parse delivery time
          const [hours, minutes] = activeSchedule.deliveryTime.split(':').map(Number);
          const time = new Date();
          time.setHours(hours, minutes, 0, 0);
          setDeliveryTime(time);
        }
      }
      
      setReports(reportsData.reports);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleCreateOrUpdateSchedule = async () => {
    try {
      const timeStr = `${deliveryTime.getHours().toString().padStart(2, '0')}:${deliveryTime.getMinutes().toString().padStart(2, '0')}`;
      
      if (schedule) {
        await healthReportApi.updateSchedule(schedule.id, {
          frequency,
          deliveryDay,
          deliveryTime: timeStr,
          emailEnabled,
          locale,
        });
      } else {
        await healthReportApi.createSchedule({
          frequency,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          deliveryDay,
          deliveryTime: timeStr,
          emailEnabled,
          locale,
        });
      }
      
      Alert.alert('Success', 'Schedule saved successfully');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save schedule');
    }
  };

  const handlePauseResume = async () => {
    if (!schedule) return;
    
    try {
      if (schedule.status === 'active') {
        await healthReportApi.pauseSchedule(schedule.id);
      } else {
        await healthReportApi.resumeSchedule(schedule.id);
      }
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update schedule');
    }
  };

  const handleDeleteSchedule = async () => {
    if (!schedule) return;
    
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await healthReportApi.deleteSchedule(schedule.id);
              setSchedule(null);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete schedule');
            }
          },
        },
      ]
    );
  };

  const handleGenerateReport = async (type: 'weekly' | 'monthly' | 'custom') => {
    try {
      const result = await healthReportApi.generateReport({
        reportType: type,
        periodStart: getPeriodStart(type),
        periodEnd: getPeriodEnd(),
      });
      
      setGeneratingJob({ id: result.jobId, status: result.status } as ReportJob);
      
      // Poll for status
      const pollStatus = async () => {
        const job = await healthReportApi.getJobStatus(result.jobId);
        setGeneratingJob(job);
        
        if (job.status === 'completed' || job.status === 'failed') {
          loadData();
        } else {
          setTimeout(pollStatus, 2000);
        }
      };
      
      pollStatus();
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report');
    }
  };

  const handleDownloadReport = async (report: HealthReport) => {
    try {
      setDownloadLoading(report.id);
      
      const { downloadUrl } = await healthReportApi.getDownloadUrl(report.id);
      
      // Download file
      const fileUri = `${FileSystem.documentDirectory}${report.fileName}`;
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, fileUri);
      
      // Share or open
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Health Report',
        });
      } else {
        // Open with appropriate app
        if (Platform.OS === 'ios') {
          await IntentLauncher.requestAsync(IntentLauncher.IntentActivity.ACTION_VIEW, {
            data: downloadResult.uri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          });
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download report');
    } finally {
      setDownloadLoading(null);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await healthReportApi.deleteReport(reportId);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete report');
            }
          },
        },
      ]
    );
  };

  const getPeriodStart = (type: string): string => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    
    if (type === 'weekly') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return start.toISOString().split('T')[0];
    } else if (type === 'monthly') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return start.toISOString().split('T')[0];
    }
    return end;
  };

  const getPeriodEnd = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const locales = [
    { value: 'en', label: 'English' },
    { value: 'vi', label: 'Tiếng Việt' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Schedule Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Report Schedule</Text>
        
        {schedule && (
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: schedule.status === 'active' ? '#10b981' : '#6b7280' }]}>
              <Text style={styles.statusBadgeText}>{schedule.status}</Text>
            </View>
            {schedule.nextRunAt && (
              <Text style={[styles.nextRun, { color: colors.text }]}>
                Next: {formatDate(schedule.nextRunAt)}
              </Text>
            )}
          </View>
        )}
        
        {/* Frequency */}
        <Text style={[styles.label, { color: colors.text }]}>Frequency</Text>
        <View style={styles.frequencyRow}>
          {(['weekly', 'monthly'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.frequencyButton,
                { borderColor: colors.tint },
                frequency === f && { backgroundColor: colors.tint },
              ]}
              onPress={() => setFrequency(f)}
            >
              <Text
                style={[
                  styles.frequencyButtonText,
                  { color: frequency === f ? '#fff' : colors.tint },
                ]}
              >
                {f === 'weekly' ? 'Weekly' : 'Monthly'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Delivery Day */}
        {frequency === 'weekly' && (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Delivery Day</Text>
            <TouchableOpacity
              style={[styles.pickerButton, { borderColor: colors.border }]}
              onPress={() => setShowDayPicker(true)}
            >
              <Text style={{ color: colors.text }}>{days[deliveryDay]}</Text>
            </TouchableOpacity>
            
            {showDayPicker && (
              <View style={styles.pickerContainer}>
                {days.map((day, index) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayOption,
                      deliveryDay === index && { backgroundColor: colors.tint },
                    ]}
                    onPress={() => {
                      setDeliveryDay(index);
                      setShowDayPicker(false);
                    }}
                  >
                    <Text style={{ color: deliveryDay === index ? '#fff' : colors.text }}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
        
        {/* Delivery Time */}
        <Text style={[styles.label, { color: colors.text }]}>Delivery Time</Text>
        <TouchableOpacity
          style={[styles.pickerButton, { borderColor: colors.border }]}
          onPress={() => setShowTimePicker(true)}
        >
          <Text style={{ color: colors.text }}>
            {deliveryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
        
        {showTimePicker && (
          <DateTimePicker
            value={deliveryTime}
            mode="time"
            onChange={(event, date) => {
              setShowTimePicker(Platform.OS === 'ios');
              if (date) setDeliveryTime(date);
            }}
          />
        )}
        
        {/* Locale */}
        <Text style={[styles.label, { color: colors.text }]}>Language</Text>
        <View style={styles.localeRow}>
          {locales.map((l) => (
            <TouchableOpacity
              key={l.value}
              style={[
                styles.localeButton,
                { borderColor: colors.tint },
                locale === l.value && { backgroundColor: colors.tint },
              ]}
              onPress={() => setLocale(l.value as 'en' | 'vi')}
            >
              <Text style={[styles.localeButtonText, { color: locale === l.value ? '#fff' : colors.tint }]}>
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Email Toggle */}
        <View style={styles.toggleRow}>
          <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Email Notification</Text>
          <Switch
            value={emailEnabled}
            onValueChange={setEmailEnabled}
            trackColor={{ true: colors.tint }}
          />
        </View>
        
        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            onPress={handleCreateOrUpdateSchedule}
          >
            <Text style={styles.primaryButtonText}>
              {schedule ? 'Update Schedule' : 'Create Schedule'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {schedule && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.tint }]}
              onPress={handlePauseResume}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.tint }]}>
                {schedule.status === 'active' ? 'Pause' : 'Resume'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: '#ef4444' }]}
              onPress={handleDeleteSchedule}
            >
              <Text style={[styles.secondaryButtonText, { color: '#ef4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Generate Report Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Generate Report</Text>
        
        <View style={styles.generateRow}>
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: colors.tint }]}
            onPress={() => handleGenerateReport('weekly')}
            disabled={!!generatingJob}
          >
            <Text style={styles.generateButtonText}>Weekly</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: colors.tint }]}
            onPress={() => handleGenerateReport('monthly')}
            disabled={!!generatingJob}
          >
            <Text style={styles.generateButtonText}>Monthly</Text>
          </TouchableOpacity>
        </View>
        
        {generatingJob && (
          <View style={styles.jobStatus}>
            <ActivityIndicator size="small" color={colors.tint} />
            <Text style={[styles.jobStatusText, { color: colors.text }]}>
              {generatingJob.status === 'queued' && 'Report queued...'}
              {generatingJob.status === 'processing' && 'Generating report...'}
              {generatingJob.status === 'completed' && 'Report ready!'}
              {generatingJob.status === 'failed' && 'Generation failed'}
            </Text>
          </View>
        )}
      </View>
      
      {/* Report History Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Report History</Text>
        
        {reports.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No reports yet
          </Text>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={[styles.reportItem, { borderColor: colors.border }]}>
              <View style={styles.reportInfo}>
                <Text style={[styles.reportType, { color: colors.text }]}>
                  {report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)} Report
                </Text>
                <Text style={[styles.reportDate, { color: colors.text }]}>
                  {formatDate(report.generatedAt)}
                </Text>
                <Text style={[styles.reportMeta, { color: colors.text }]}>
                  {formatFileSize(report.fileSize)} • {report.dataCompleteness} data
                </Text>
              </View>
              
              <View style={styles.reportActions}>
                <TouchableOpacity
                  style={[styles.smallButton, { backgroundColor: colors.tint }]}
                  onPress={() => handleDownloadReport(report)}
                  disabled={downloadLoading === report.id}
                >
                  {downloadLoading === report.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.smallButtonText}>Download</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.smallButton, { backgroundColor: '#ef4444' }]}
                  onPress={() => handleDeleteReport(report.id)}
                >
                  <Text style={styles.smallButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  nextRun: {
    marginLeft: 12,
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 12,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pickerButton: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  pickerContainer: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  localeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  localeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  localeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  generateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  generateButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  jobStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  jobStatusText: {
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 14,
  },
  reportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  reportInfo: {
    flex: 1,
  },
  reportType: {
    fontSize: 16,
    fontWeight: '500',
  },
  reportDate: {
    fontSize: 14,
    marginTop: 4,
  },
  reportMeta: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});
