export default function partitionArray<T>(data: T[], numberOfPartitions: number): T[][] {
    const result: T[][] = [];
    const minPartitionSize = Math.floor(data.length / numberOfPartitions);
    const extraCount = data.length % numberOfPartitions;
    let startIndex = 0;
    for (let i = 0; i < numberOfPartitions; i++) {
        const partitionSize = minPartitionSize + (i < extraCount ? 1 : 0);
        const partition = data.slice(startIndex, startIndex + partitionSize);
        result.push(partition);
        startIndex += partitionSize;
    }
    return result;
}