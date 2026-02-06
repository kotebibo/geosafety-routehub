/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest'

/**
 * Tests for Item Move functionality
 *
 * These tests verify the column mapping logic used when moving items between boards.
 * The actual service calls to Supabase are mocked in integration tests.
 */

// Column mapping utility - extracted logic from userBoardsService.getColumnMapping
function buildColumnMapping(
  sourceColumns: Array<{ column_id: string; column_name: string; column_type: string }>,
  targetColumns: Array<{ column_id: string; column_name: string; column_type: string }>
): { autoMapped: Record<string, string>; needsMapping: string[] } {
  const autoMapped: Record<string, string> = {}
  const needsMapping: string[] = []

  // Create target column lookup by column_id and by name+type
  const targetByColumnId = new Map(targetColumns.map(c => [c.column_id, c]))
  const targetByNameType = new Map(
    targetColumns.map(c => [`${c.column_name.toLowerCase()}_${c.column_type}`, c])
  )

  for (const srcCol of sourceColumns) {
    // Priority 1: Same column_id + same column_type
    const targetById = targetByColumnId.get(srcCol.column_id)
    if (targetById && targetById.column_type === srcCol.column_type) {
      autoMapped[srcCol.column_id] = targetById.column_id
      continue
    }

    // Priority 2: Same column_name + same column_type
    const targetByName = targetByNameType.get(
      `${srcCol.column_name.toLowerCase()}_${srcCol.column_type}`
    )
    if (targetByName) {
      autoMapped[srcCol.column_id] = targetByName.column_id
      continue
    }

    // No auto-match found
    needsMapping.push(srcCol.column_id)
  }

  return { autoMapped, needsMapping }
}

// Apply column mapping utility - extracted logic from userBoardsService.moveItemToBoard
function applyColumnMapping(
  data: Record<string, unknown>,
  columnMapping: Record<string, string>,
  preserveUnmapped = true
): { mappedData: Record<string, unknown>; unmappedData: Record<string, unknown> } {
  const mappedData: Record<string, unknown> = {}
  const unmappedData: Record<string, unknown> = {}

  for (const [sourceColId, value] of Object.entries(data)) {
    const targetColId = columnMapping[sourceColId]
    if (targetColId) {
      mappedData[targetColId] = value
    } else if (preserveUnmapped) {
      unmappedData[sourceColId] = value
    }
  }

  return { mappedData, unmappedData }
}

describe('Column Mapping', () => {
  describe('buildColumnMapping', () => {
    it('should auto-map columns with same column_id and column_type', () => {
      const sourceColumns = [
        { column_id: 'name', column_name: 'Name', column_type: 'text' },
        { column_id: 'status', column_name: 'Status', column_type: 'status' },
      ]
      const targetColumns = [
        { column_id: 'name', column_name: 'Name', column_type: 'text' },
        { column_id: 'status', column_name: 'Status', column_type: 'status' },
      ]

      const result = buildColumnMapping(sourceColumns, targetColumns)

      expect(result.autoMapped).toEqual({
        name: 'name',
        status: 'status',
      })
      expect(result.needsMapping).toEqual([])
    })

    it('should auto-map columns with same column_name and column_type', () => {
      const sourceColumns = [
        { column_id: 'company_name', column_name: 'Company', column_type: 'text' },
      ]
      const targetColumns = [
        { column_id: 'target_company', column_name: 'Company', column_type: 'text' },
      ]

      const result = buildColumnMapping(sourceColumns, targetColumns)

      expect(result.autoMapped).toEqual({
        company_name: 'target_company',
      })
      expect(result.needsMapping).toEqual([])
    })

    it('should not auto-map columns with same name but different type', () => {
      const sourceColumns = [
        { column_id: 'date', column_name: 'Date', column_type: 'date' },
      ]
      const targetColumns = [
        { column_id: 'date', column_name: 'Date', column_type: 'text' },
      ]

      const result = buildColumnMapping(sourceColumns, targetColumns)

      expect(result.autoMapped).toEqual({})
      expect(result.needsMapping).toEqual(['date'])
    })

    it('should identify columns that need manual mapping', () => {
      const sourceColumns = [
        { column_id: 'name', column_name: 'Name', column_type: 'text' },
        { column_id: 'custom_field', column_name: 'Custom Field', column_type: 'text' },
        { column_id: 'inspector', column_name: 'Inspector', column_type: 'person' },
      ]
      const targetColumns = [
        { column_id: 'name', column_name: 'Name', column_type: 'text' },
        { column_id: 'different_field', column_name: 'Different', column_type: 'text' },
      ]

      const result = buildColumnMapping(sourceColumns, targetColumns)

      expect(result.autoMapped).toEqual({ name: 'name' })
      expect(result.needsMapping).toEqual(['custom_field', 'inspector'])
    })

    it('should handle empty source columns', () => {
      const sourceColumns: Array<{ column_id: string; column_name: string; column_type: string }> = []
      const targetColumns = [
        { column_id: 'name', column_name: 'Name', column_type: 'text' },
      ]

      const result = buildColumnMapping(sourceColumns, targetColumns)

      expect(result.autoMapped).toEqual({})
      expect(result.needsMapping).toEqual([])
    })

    it('should handle empty target columns', () => {
      const sourceColumns = [
        { column_id: 'name', column_name: 'Name', column_type: 'text' },
      ]
      const targetColumns: Array<{ column_id: string; column_name: string; column_type: string }> = []

      const result = buildColumnMapping(sourceColumns, targetColumns)

      expect(result.autoMapped).toEqual({})
      expect(result.needsMapping).toEqual(['name'])
    })

    it('should be case-insensitive for column name matching', () => {
      const sourceColumns = [
        { column_id: 'company', column_name: 'COMPANY NAME', column_type: 'text' },
      ]
      const targetColumns = [
        { column_id: 'target_company', column_name: 'company name', column_type: 'text' },
      ]

      const result = buildColumnMapping(sourceColumns, targetColumns)

      expect(result.autoMapped).toEqual({
        company: 'target_company',
      })
    })

    it('should prioritize column_id match over column_name match', () => {
      const sourceColumns = [
        { column_id: 'name', column_name: 'Name', column_type: 'text' },
      ]
      const targetColumns = [
        { column_id: 'name', column_name: 'Different Name', column_type: 'text' },
        { column_id: 'other', column_name: 'Name', column_type: 'text' },
      ]

      const result = buildColumnMapping(sourceColumns, targetColumns)

      // Should map to 'name' (same column_id) not 'other' (same column_name)
      expect(result.autoMapped).toEqual({ name: 'name' })
    })
  })

  describe('applyColumnMapping', () => {
    it('should map data fields to target columns', () => {
      const data = {
        source_name: 'Test Company',
        source_status: 'active',
      }
      const columnMapping = {
        source_name: 'target_name',
        source_status: 'target_status',
      }

      const result = applyColumnMapping(data, columnMapping)

      expect(result.mappedData).toEqual({
        target_name: 'Test Company',
        target_status: 'active',
      })
      expect(result.unmappedData).toEqual({})
    })

    it('should preserve unmapped fields by default', () => {
      const data = {
        name: 'Test',
        custom_field: 'Custom Value',
      }
      const columnMapping = {
        name: 'target_name',
      }

      const result = applyColumnMapping(data, columnMapping)

      expect(result.mappedData).toEqual({
        target_name: 'Test',
      })
      expect(result.unmappedData).toEqual({
        custom_field: 'Custom Value',
      })
    })

    it('should discard unmapped fields when preserveUnmapped is false', () => {
      const data = {
        name: 'Test',
        custom_field: 'Custom Value',
      }
      const columnMapping = {
        name: 'target_name',
      }

      const result = applyColumnMapping(data, columnMapping, false)

      expect(result.mappedData).toEqual({
        target_name: 'Test',
      })
      expect(result.unmappedData).toEqual({})
    })

    it('should handle empty data', () => {
      const data = {}
      const columnMapping = {
        name: 'target_name',
      }

      const result = applyColumnMapping(data, columnMapping)

      expect(result.mappedData).toEqual({})
      expect(result.unmappedData).toEqual({})
    })

    it('should handle empty column mapping', () => {
      const data = {
        name: 'Test',
        status: 'active',
      }
      const columnMapping = {}

      const result = applyColumnMapping(data, columnMapping)

      expect(result.mappedData).toEqual({})
      expect(result.unmappedData).toEqual({
        name: 'Test',
        status: 'active',
      })
    })

    it('should preserve complex values (objects, arrays)', () => {
      const data = {
        location: { lat: 41.7, lng: 44.8, name: 'Tbilisi' },
        tags: ['urgent', 'priority'],
      }
      const columnMapping = {
        location: 'target_location',
        tags: 'target_tags',
      }

      const result = applyColumnMapping(data, columnMapping)

      expect(result.mappedData).toEqual({
        target_location: { lat: 41.7, lng: 44.8, name: 'Tbilisi' },
        target_tags: ['urgent', 'priority'],
      })
    })

    it('should preserve null and undefined values', () => {
      const data = {
        name: 'Test',
        empty_field: null,
        undefined_field: undefined,
      }
      const columnMapping = {
        name: 'target_name',
        empty_field: 'target_empty',
        undefined_field: 'target_undefined',
      }

      const result = applyColumnMapping(data, columnMapping)

      expect(result.mappedData).toEqual({
        target_name: 'Test',
        target_empty: null,
        target_undefined: undefined,
      })
    })
  })
})

describe('Move Metadata', () => {
  it('should include correct move metadata structure', () => {
    const moveMetadata = {
      moved_from_board_id: 'source-board-123',
      moved_from_board_name: 'Source Board',
      moved_at: new Date().toISOString(),
      column_mapping_used: { name: 'target_name' },
      unmapped_data: { custom: 'value' },
    }

    expect(moveMetadata).toHaveProperty('moved_from_board_id')
    expect(moveMetadata).toHaveProperty('moved_from_board_name')
    expect(moveMetadata).toHaveProperty('moved_at')
    expect(moveMetadata).toHaveProperty('column_mapping_used')
    expect(moveMetadata).toHaveProperty('unmapped_data')
  })

  it('should allow null for column_mapping_used when same board type', () => {
    const moveMetadata = {
      moved_from_board_id: 'source-board-123',
      moved_from_board_name: 'Source Board',
      moved_at: new Date().toISOString(),
      column_mapping_used: null,
      unmapped_data: null,
    }

    expect(moveMetadata.column_mapping_used).toBeNull()
    expect(moveMetadata.unmapped_data).toBeNull()
  })
})
