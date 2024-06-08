import partitionArray from '@/array';

describe('partitionArray', () => {
    it('should partition an array into equal parts', () => {
        const array = [1, 2, 3, 4, 5, 6];
        const partitions = partitionArray(array, 3);
        expect(partitions).toEqual([[1, 2], [3, 4], [5, 6]]);
    });
});